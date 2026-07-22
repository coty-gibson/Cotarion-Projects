import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { PricingApplicationError } from "@/application/pricing/pricing-application-errors";
import type { PricingApplicationService, PricingCommandRequest } from "@/application/pricing/pricing-application-service";
import type { PricingDraft, PricingProject } from "@/domain/pricing";
import {
  decodePricingConcurrencyToken,
  encodePricingConcurrencyToken,
  PricingConcurrencyTokenError
} from "@/application/pricing/pricing-concurrency-token";

const MAX_BODY_BYTES = 1_048_576;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICING_MODELS = new Set(["PROJECT", "FIXED_RETAINER", "PROFIT_SHARE_RETAINER", "HYBRID_RETAINER", "ADVISORY_HOURLY"]);

export interface PricingHttpDependencies {
  readonly authenticate: () => Promise<AuthenticatedIdentity | null>;
  readonly application: PricingApplicationService;
  readonly now?: () => Date;
  readonly randomUUID?: () => string;
  readonly log?: (entry: Readonly<Record<string, unknown>>) => void;
}

class HttpValidationError extends Error {}

function record(value: unknown, field = "Request body"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpValidationError(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function identifier(value: unknown, field: string) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) throw new HttpValidationError(`${field} is invalid.`);
  return value;
}

function pricingProjectId(value: unknown) {
  if (typeof value !== "string" || !UUID.test(value)) throw new HttpValidationError("Pricing Project ID must be a UUID.");
  return value;
}

function text(value: unknown, field: string, max = 10_000) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new HttpValidationError(`${field} is invalid.`);
  return value.trim();
}

function positiveInteger(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new HttpValidationError(`${field} must be a positive integer.`);
  return Number(value);
}

function concurrencyVersion(value: unknown) {
  try {
    return decodePricingConcurrencyToken(value);
  } catch (error) {
    if (error instanceof PricingConcurrencyTokenError) throw new HttpValidationError(error.message);
    throw error;
  }
}

function jsonObject(value: unknown, field: string) {
  return record(value, field) as PricingDraft["inputSnapshot"];
}

function pricingDraft(value: unknown): PricingDraft {
  const input = record(value, "Pricing Draft");
  if (!PRICING_MODELS.has(String(input.pricingModel))) throw new HttpValidationError("Pricing Model is invalid.");
  if (input.currency !== "USD") throw new HttpValidationError("Pricing currency is invalid.");
  return {
    projectName: text(input.projectName, "Project name", 200),
    pricingModel: input.pricingModel as PricingDraft["pricingModel"],
    currency: "USD",
    pricingConfigurationVersionId: identifier(input.pricingConfigurationVersionId, "Pricing Configuration Version ID"),
    pricingConfigurationVersion: positiveInteger(input.pricingConfigurationVersion, "Pricing Configuration Version"),
    configurationSchemaVersion: positiveInteger(input.configurationSchemaVersion, "Configuration schema version"),
    engineVersion: text(input.engineVersion, "Pricing engine version", 200),
    methodologyVersion: text(input.methodologyVersion, "Pricing methodology version", 200),
    inputSnapshot: jsonObject(input.inputSnapshot, "Pricing input snapshot"),
    outputSnapshot: jsonObject(input.outputSnapshot, "Pricing output snapshot"),
    explanationSnapshot: jsonObject(input.explanationSnapshot, "Pricing explanation snapshot"),
    catalogSnapshot: jsonObject(input.catalogSnapshot, "Pricing catalog snapshot")
  };
}

async function jsonBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new HttpValidationError("Request body is too large.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new HttpValidationError("Request body is too large.");
  if (!raw.trim()) return {};
  try { return record(JSON.parse(raw)); } catch (error) {
    if (error instanceof HttpValidationError) throw error;
    throw new HttpValidationError("Request body contains malformed JSON.");
  }
}

function commandDto(aggregate: PricingProject, revision: number, idempotentReplay: boolean) {
  return {
    pricingProject: {
      id: aggregate.id.value,
      estimateNumber: aggregate.estimateNumber,
      companyId: aggregate.companyId.value,
      clientId: aggregate.clientId.value,
      ownerId: aggregate.ownerId.value,
      projectName: aggregate.draft.projectName,
      pricingModel: aggregate.draft.pricingModel,
      currency: aggregate.draft.currency,
      status: aggregate.status,
      draftCurrency: aggregate.draftCurrency.revision,
      versionCount: aggregate.versions.length,
      latestVersionNumber: aggregate.versions.at(-1)?.number.value ?? null,
      reviewCandidate: aggregate.reviewCandidate ? {
        pricingVersionId: aggregate.reviewCandidate.versionId.value,
        versionNumber: aggregate.reviewCandidate.versionNumber.value,
        requestedAt: aggregate.reviewCandidate.requestedAt
      } : null,
      approvedVersion: aggregate.approvedVersion ? {
        pricingVersionId: aggregate.approvedVersion.versionId.value,
        versionNumber: aggregate.approvedVersion.versionNumber.value,
        approvedAt: aggregate.approvedVersion.approvedAt
      } : null
    },
    concurrencyToken: encodePricingConcurrencyToken(revision),
    idempotentReplay
  };
}

const statusByCode: Record<string, number> = {
  NOT_AUTHENTICATED: 401,
  COMPANY_SCOPE_VIOLATION: 403,
  CAPABILITY_DENIED: 403,
  PRICING_PROJECT_NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  DOMAIN_RULE_VIOLATION: 409,
  OPTIMISTIC_CONCURRENCY_CONFLICT: 409,
  TRANSACTION_FAILURE: 500
};

function errorResponse(error: unknown, correlationId: string, requestId: string) {
  if (error instanceof HttpValidationError) {
    return Response.json({ error: { code: "INVALID_REQUEST", message: error.message }, correlationId, requestId }, { status: 400 });
  }
  if (error instanceof PricingApplicationError) {
    const status = statusByCode[error.code] ?? 500;
    return Response.json({
      error: { code: error.code, message: status === 500 ? "Pricing request failed." : error.message },
      correlationId,
      requestId
    }, { status });
  }
  return Response.json({ error: { code: "TRANSACTION_FAILURE", message: "Pricing request failed." }, correlationId, requestId }, { status: 500 });
}

async function execute(
  request: Request,
  dependencies: PricingHttpDependencies,
  handler: (context: { identity: AuthenticatedIdentity; companyId: string; requestId: string; occurredAt: string }) => Promise<{ body: unknown; status?: number }>
) {
  const started = performance.now();
  const randomUUID = dependencies.randomUUID ?? crypto.randomUUID;
  const suppliedCorrelation = request.headers.get("x-correlation-id");
  const suppliedRequest = request.headers.get("idempotency-key");
  if (suppliedCorrelation && !UUID.test(suppliedCorrelation)) return errorResponse(new HttpValidationError("Correlation ID must be a UUID."), randomUUID(), randomUUID());
  if (suppliedRequest && !UUID.test(suppliedRequest)) return errorResponse(new HttpValidationError("Request Identity must be a UUID."), suppliedCorrelation ?? randomUUID(), randomUUID());
  const correlationId = suppliedCorrelation ?? randomUUID();
  const requestId = suppliedRequest ?? randomUUID();
  let response: Response;
  try {
    const identity = await dependencies.authenticate();
    if (!identity) throw new PricingApplicationError("NOT_AUTHENTICATED", "Authentication is required.");
    const companyId = identifier(request.headers.get("x-company-id"), "Company ID");
    const result = await handler({ identity, companyId, requestId, occurredAt: (dependencies.now ?? (() => new Date()))().toISOString() });
    response = Response.json({ data: result.body, correlationId, requestId }, { status: result.status ?? 200 });
  } catch (error) {
    response = errorResponse(error, correlationId, requestId);
  }
  const elapsed = Math.max(0, performance.now() - started);
  response.headers.set("x-correlation-id", correlationId);
  response.headers.set("x-request-id", requestId);
  response.headers.set("server-timing", `app;dur=${elapsed.toFixed(1)}`);
  (dependencies.log ?? ((entry) => console.info(JSON.stringify(entry))))({
    type: "pricing_http_request", method: request.method, path: new URL(request.url).pathname,
    status: response.status, correlationId, requestId, durationMs: Number(elapsed.toFixed(1))
  });
  return response;
}

export function handlePricingCollection(request: Request, dependencies: PricingHttpDependencies) {
  return execute(request, dependencies, async (context) => {
    if (request.method !== "POST") throw new HttpValidationError("HTTP method is not supported.");
    const body = await jsonBody(request);
    const result = await dependencies.application.createPricingProject(context, {
      clientId: identifier(body.clientId, "Client ID"),
      ownerId: body.ownerId === undefined ? undefined : identifier(body.ownerId, "Owner ID"),
      draft: pricingDraft(body.draft)
    });
    return { body: commandDto(result.aggregate, result.revision, result.idempotentReplay), status: 201 };
  });
}

export function handlePricingResource(request: Request, path: readonly string[], dependencies: PricingHttpDependencies) {
  return execute(request, dependencies, async (context) => {
    const projectId = pricingProjectId(path[0]);
    if (request.method !== "POST" && request.method !== "PATCH") throw new HttpValidationError("HTTP method is not supported.");
    const body = await jsonBody(request);
    const input: PricingCommandRequest = {
      ...context,
      expectedRevision: concurrencyVersion(body.concurrencyToken)
    };
    const command = path.slice(1).join("/");
    let result;
    switch (command) {
      case "draft":
        if (request.method !== "PATCH") throw new HttpValidationError("Draft updates require PATCH.");
        result = await dependencies.application.updateDraft(input, projectId, pricingDraft(body.draft));
        break;
      case "versions": result = await dependencies.application.saveVersion(input, projectId); break;
      case "quality-review": result = await dependencies.application.requestQualityReview(input, projectId, positiveInteger(body.versionNumber, "Version number")); break;
      case "approve": result = await dependencies.application.approveVersion(input, projectId); break;
      case "reject": result = await dependencies.application.rejectVersion(input, projectId, text(body.finding, "Review finding", 5_000)); break;
      case "revision": result = await dependencies.application.beginRevision(input, projectId); break;
      case "archive": result = await dependencies.application.archiveProject(input, projectId); break;
      default: throw new HttpValidationError("Pricing command endpoint was not found.");
    }
    return { body: commandDto(result.aggregate, result.revision, result.idempotentReplay) };
  });
}
