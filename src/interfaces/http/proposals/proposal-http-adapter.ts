import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import type { ProposalApplicationService } from "@/application/proposals/proposal-application-service";
import type { ProposalQueryService } from "@/application/proposals/proposal-query-service";
import type { ProposalRepresentationService } from "@/application/proposals/proposal-representation-service";
import type { ProposalRepresentationQueryService } from "@/application/proposals/proposal-representation-query-service";
import type { ProposalDeliveryService } from "@/application/proposals/proposal-delivery-service";
import type { ProposalDeliveryQueryService } from "@/application/proposals/proposal-delivery-query-service";
import type { ProposalClientDecisionQueryService } from "@/application/proposals/proposal-client-decision-query-service";
import type { AgreementService } from "@/application/agreements/agreement-service";
import type { AgreementQueryService } from "@/application/agreements/agreement-query-service";
import {
  decodeProposalConcurrencyToken,
  ProposalConcurrencyTokenError
} from "@/application/proposals/proposal-concurrency-token";
import { engagementTypePolicy as proposalEngagementTypePolicy } from "@/domain/proposals/engagement-type-policies";

const MAX_BODY_BYTES = 1_048_576;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["DRAFT", "INTERNAL_REVIEW", "EXECUTIVE_AUTHORIZATION", "APPROVED", "REJECTED", "SUBMITTED", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED", "ARCHIVED"]);
const ENGAGEMENT_TYPES = new Set(["STRATEGY_SESSION", "ADVISORY", "DIAGNOSTIC", "PROJECT", "RETAINER"]);

export interface ProposalHttpServices {
  readonly application: ProposalApplicationService;
  readonly queries: ProposalQueryService;
  readonly representations: ProposalRepresentationService;
  readonly representationQueries: ProposalRepresentationQueryService;
  readonly deliveries: ProposalDeliveryService;
  readonly deliveryQueries: ProposalDeliveryQueryService;
  readonly decisionQueries?: ProposalClientDecisionQueryService;
  readonly agreements?: AgreementService;
  readonly agreementQueries?: AgreementQueryService;
}

export interface ProposalHttpDependencies {
  readonly authenticate: () => Promise<AuthenticatedIdentity | null>;
  readonly services: ProposalHttpServices;
  readonly now?: () => Date;
  readonly randomUUID?: () => string;
  readonly log?: (entry: Readonly<Record<string, unknown>>) => void;
}

class HttpValidationError extends Error {}

function concurrencyRevision(value: unknown) {
  try { return decodeProposalConcurrencyToken(value); }
  catch (error) {
    if (error instanceof ProposalConcurrencyTokenError) throw new HttpValidationError(error.message);
    throw error;
  }
}

function identifier(value: unknown, field: string) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) throw new HttpValidationError(`${field} is invalid.`);
  return value;
}

function text(value: unknown, field: string, max = 10_000) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new HttpValidationError(`${field} is invalid.`);
  return value.trim();
}

function optionalText(value: unknown, field: string, max = 10_000) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > max) throw new HttpValidationError(`${field} is invalid.`);
  return value;
}

function record(value: unknown, field = "Request body"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpValidationError(`${field} must be an object.`);
  return value as Record<string, unknown>;
}

function isoTimestamp(value: unknown, field: string) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new HttpValidationError(`${field} is invalid.`);
  return new Date(value).toISOString();
}

function proposalIdentifier(value: unknown, field = "Proposal ID") {
  if (typeof value !== "string" || !UUID.test(value)) throw new HttpValidationError(`${field} must be a UUID.`);
  return value;
}

function engagementTypeCode(value: unknown) {
  if (typeof value !== "string" || !ENGAGEMENT_TYPES.has(value)) {
    throw new HttpValidationError("Engagement Type is invalid.");
  }
  return value as "STRATEGY_SESSION" | "ADVISORY" | "DIAGNOSTIC" | "PROJECT" | "RETAINER";
}

function draftUpdate(value: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  if (value.title !== undefined) result.title = text(value.title, "Proposal title", 200);
  if (value.expirationAt !== undefined) result.expirationAt = isoTimestamp(value.expirationAt, "Expiration timestamp");
  if (value.expirationOverrideReason !== undefined) result.expirationOverrideReason = optionalText(value.expirationOverrideReason, "Expiration override reason", 2_000);
  if (value.content !== undefined) result.content = record(value.content, "Proposal content");
  if (value.commercialTerms !== undefined) {
    const terms = record(value.commercialTerms, "Commercial terms");
    for (const field of ["paymentSchedule", "billingMethod", "depositTerms", "recurrenceAndTerm", "cancellationSummary", "assumptionsAndExclusions", "clientResponsibilities", "offerNotes"]) {
      if (typeof terms[field] !== "string" || (terms[field] as string).length > 10_000) throw new HttpValidationError(`Commercial terms ${field} is invalid.`);
    }
    result.commercialTerms = terms;
  }
  if (value.recipients !== undefined) {
    if (!Array.isArray(value.recipients) || value.recipients.length > 100) throw new HttpValidationError("Recipients are invalid.");
    result.recipients = value.recipients.map((entry, index) => {
      const recipient = record(entry, `Recipient ${index + 1}`);
      if (typeof recipient.authorizedToAccept !== "boolean") throw new HttpValidationError(`Recipient ${index + 1} authorization is invalid.`);
      return {
        recipientId: identifier(recipient.recipientId, `Recipient ${index + 1} ID`),
        contactId: recipient.contactId === null ? null : identifier(recipient.contactId, `Recipient ${index + 1} Contact ID`),
        name: text(recipient.name, `Recipient ${index + 1} name`, 200),
        email: text(recipient.email, `Recipient ${index + 1} email`, 320),
        authorizedToAccept: recipient.authorizedToAccept
      };
    });
  }
  if (!Object.keys(result).length) throw new HttpValidationError("Draft update has no supported fields.");
  return result;
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

function commandResponse(proposal: unknown, idempotentReplay: boolean) {
  return { proposal, idempotentReplay };
}

const statusByErrorCode: Record<string, number> = {
  NOT_AUTHENTICATED: 401,
  CAPABILITY_DENIED: 403,
  COMPANY_SCOPE_VIOLATION: 403,
  PROPOSAL_NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  DOMAIN_RULE_VIOLATION: 409,
  OPTIMISTIC_CONCURRENCY_CONFLICT: 409,
  IMMUTABLE_PERSISTENCE_CONFLICT: 409,
  AUTHORITY_CONFIGURATION_MISSING: 409,
  AUTHORITY_CONFLICT: 409,
  TRANSACTION_FAILURE: 500
};

function errorResponse(error: unknown, correlationId: string, requestId: string) {
  if (error instanceof HttpValidationError) return Response.json({ error: { code: "INVALID_REQUEST", message: error.message }, correlationId, requestId }, { status: 400 });
  if (error instanceof ProposalApplicationError) {
    const status = statusByErrorCode[error.code] ?? 500;
    return Response.json({ error: { code: error.code, message: status === 500 ? "Proposal request failed." : error.message }, correlationId, requestId }, { status });
  }
  return Response.json({ error: { code: "TRANSACTION_FAILURE", message: "Proposal request failed." }, correlationId, requestId }, { status: 500 });
}

async function execute(
  request: Request,
  dependencies: ProposalHttpDependencies,
  handler: (context: { identity: AuthenticatedIdentity; companyId: string; requestId: string; occurredAt: string }) => Promise<{ body: unknown; status?: number } | Response>
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
    if (!identity) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication is required.");
    const companyId = identifier(request.headers.get("x-company-id"), "Company ID");
    const result = await handler({ identity, companyId, requestId, occurredAt: (dependencies.now ?? (() => new Date()))().toISOString() });
    response = result instanceof Response
      ? result
      : Response.json({ data: result.body, correlationId, requestId }, { status: result.status ?? 200 });
  } catch (error) {
    response = errorResponse(error, correlationId, requestId);
  }
  const elapsed = Math.max(0, performance.now() - started);
  response.headers.set("x-correlation-id", correlationId);
  response.headers.set("x-request-id", requestId);
  response.headers.set("server-timing", `app;dur=${elapsed.toFixed(1)}`);
  (dependencies.log ?? ((entry) => console.info(JSON.stringify(entry))))({
    type: "proposal_http_request",
    method: request.method,
    path: new URL(request.url).pathname,
    status: response.status,
    correlationId,
    requestId,
    durationMs: Number(elapsed.toFixed(1))
  });
  return response;
}

function appRequest(context: { identity: AuthenticatedIdentity; companyId: string; requestId: string; occurredAt: string }) {
  return context;
}

export function handleProposalCollection(request: Request, dependencies: ProposalHttpDependencies) {
  return execute(request, dependencies, async (context) => {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const limitText = url.searchParams.get("limit");
      const limit = limitText === null ? undefined : Number(limitText);
      if (limit !== undefined && !Number.isSafeInteger(limit)) throw new HttpValidationError("Pagination limit is invalid.");
      const status = url.searchParams.get("status") ?? undefined;
      if (status && !STATUSES.has(status)) throw new HttpValidationError("Proposal status filter is invalid.");
      const clientId = url.searchParams.get("clientId") ?? undefined;
      const ownerId = url.searchParams.get("ownerId") ?? undefined;
      const result = await dependencies.services.queries.list(context.identity, context.companyId, {
        limit,
        cursor: url.searchParams.get("cursor") ?? undefined,
        filter: {
          status,
          clientId: clientId ? identifier(clientId, "Client ID") : undefined,
          ownerId: ownerId ? identifier(ownerId, "Owner ID") : undefined
        }
      });
      return { body: result };
    }
    if (request.method !== "POST") throw new HttpValidationError("HTTP method is not supported.");
    const body = await jsonBody(request);
    const result = await dependencies.services.application.createProposal(appRequest(context), {
      clientId: identifier(body.clientId, "Client ID"),
      ownerId: body.ownerId === undefined ? undefined : identifier(body.ownerId, "Owner ID"),
      engagementTypePolicy: proposalEngagementTypePolicy(engagementTypeCode(body.engagementTypeCode)),
      pricingProjectId: identifier(body.pricingProjectId, "Pricing Project ID"),
      pricingVersionId: identifier(body.pricingVersionId, "Pricing Version ID"),
      title: text(body.title, "Proposal title", 200),
      expirationAt: body.expirationAt === undefined ? undefined : isoTimestamp(body.expirationAt, "Expiration timestamp"),
      expirationOverrideReason: optionalText(body.expirationOverrideReason, "Expiration override reason", 2_000)
    });
    const proposal = await dependencies.services.queries.load(context.identity, context.companyId, result.aggregate.state.id);
    return { body: commandResponse(proposal, result.idempotentReplay), status: 201 };
  });
}

export function handleProposalResource(request: Request, path: readonly string[], dependencies: ProposalHttpDependencies) {
  return execute(request, dependencies, async (context) => {
    const proposalId = proposalIdentifier(path[0]);
    if (path[1] === "representations" && path[3] === "deliveries" && path.length === 4 && request.method === "POST") {
      const body = await jsonBody(request);
      const recipients = Array.isArray(body.recipients) ? body.recipients.map((value) => { const recipient = record(value, "Delivery recipient"); return { name: text(recipient.name, "Recipient name", 200), email: text(recipient.email, "Recipient email", 320), recipientRole: optionalText(recipient.recipientRole, "Recipient role", 100) ?? null }; }) : [];
      const result = await dependencies.services.deliveries.create(context.identity, context.companyId, { proposalId, representationId: identifier(path[2], "Representation ID"), recipients, expiresAt: isoTimestamp(body.expiresAt, "Delivery expiration"), requestIdentity: context.requestId, correlationId: context.requestId, requestedAt: context.occurredAt });
      return { body: { delivery: result.delivery, secureUrl: `/proposal-delivery/${result.secureToken}`, idempotentReplay: result.idempotentReplay }, status: result.idempotentReplay ? 200 : 201 };
    }
    if (path[1] === "deliveries") {
      if (request.method === "GET" && path.length === 2) return { body: await dependencies.services.deliveryQueries.list(context.identity, context.companyId, proposalId) };
      if (request.method === "GET" && path.length === 3 && path[2] === "history") return { body: await dependencies.services.deliveryQueries.history(context.identity, context.companyId, proposalId) };
      if (request.method === "GET" && path.length === 3 && path[2] === "active") return { body: await dependencies.services.deliveryQueries.activeLinks(context.identity, context.companyId, proposalId) };
      const deliveryId = identifier(path[2], "Delivery ID");
      if (request.method === "GET" && path.length === 3) return { body: await dependencies.services.deliveryQueries.detail(context.identity, context.companyId, proposalId, deliveryId) };
      if (request.method === "GET" && path.length === 4 && path[3] === "accesses") return { body: await dependencies.services.deliveryQueries.accessHistory(context.identity, context.companyId, proposalId, deliveryId) };
      if (request.method === "POST" && path.length === 4 && path[3] === "revoke") return { body: await dependencies.services.deliveries.revoke(context.identity, context.companyId, { proposalId, deliveryId, occurredAt: context.occurredAt, correlationId: context.requestId }) };
      if (request.method === "POST" && path.length === 4 && path[3] === "expire") return { body: await dependencies.services.deliveries.expire(context.identity, context.companyId, { proposalId, deliveryId, occurredAt: context.occurredAt, correlationId: context.requestId }) };
    }
    if (path[1] === "decisions") {
      const queries = dependencies.services.decisionQueries;
      if (!queries) throw new ProposalApplicationError("TRANSACTION_FAILURE", "Proposal Decision queries are unavailable.");
      if (request.method === "GET" && path.length === 2) return { body: await queries.history(context.identity, context.companyId, proposalId) };
      if (request.method === "GET" && path.length === 3 && path[2] === "current") return { body: await queries.current(context.identity, context.companyId, proposalId) };
      if (request.method === "GET" && path.length === 3 && path[2] === "timeline") return { body: await queries.timeline(context.identity, context.companyId, proposalId) };
      if (request.method === "GET" && path.length === 4 && path[2] === "delivery") return { body: await queries.deliveryStatus(context.identity, context.companyId, proposalId, identifier(path[3], "Delivery ID")) };
    }
    if (path[1] === "agreements") {
      const commands = dependencies.services.agreements; const queries = dependencies.services.agreementQueries;
      if (!commands || !queries) throw new ProposalApplicationError("TRANSACTION_FAILURE", "Agreement services are unavailable.");
      if (request.method === "POST" && path.length === 2) { const generated = await commands.generate(context.identity, context.companyId, { proposalId, generatedAt: context.occurredAt, requestIdentity: context.requestId, correlationId: context.requestId }); return { body: generated, status: generated.idempotentReplay ? 200 : 201 }; }
      if (request.method === "GET" && path.length === 2) return { body: await queries.list(context.identity, context.companyId, proposalId) };
      if (request.method === "GET" && path.length === 3) { const agreementId = identifier(path[2], "Agreement ID"); const type = new URL(request.url).searchParams.get("artifact"); if (type === "HTML" || type === "PDF") { const artifact = await queries.artifact(context.identity, context.companyId, proposalId, agreementId, type); return new Response(Buffer.from(artifact.content), { headers: { "content-type": artifact.contentType, "content-disposition": `${type === "PDF" ? "attachment" : "inline"}; filename="${artifact.agreementNumber.toLowerCase()}.${type.toLowerCase()}"`, "x-content-type-options": "nosniff", "cache-control": "private, no-store" } }); } return { body: await queries.detail(context.identity, context.companyId, proposalId, agreementId) }; }
    }
    const representationType = (value: unknown) => {
      if (value !== "HTML" && value !== "PDF") throw new HttpValidationError("Representation Type is invalid.");
      return value;
    };
    if (request.method === "POST" && path.length === 4 && path[1] === "versions" && path[3] === "representations") {
      const body = await jsonBody(request);
      const generated = await dependencies.services.representations.generate(
        context.identity,
        context.companyId,
        {
          proposalId,
          proposalVersionId: identifier(path[2], "Proposal Version ID"),
          representationType: representationType(body.representationType),
          generatedAt: context.occurredAt
        }
      );
      const detail = await dependencies.services.representationQueries.detail(
        context.identity,
        context.companyId,
        proposalId,
        generated.record.id
      );
      return { body: { representation: detail, idempotentReplay: generated.idempotentReplay }, status: generated.idempotentReplay ? 200 : 201 };
    }
    if (request.method === "GET" && path[1] === "representations") {
      if (path.length === 2) {
        const versionId = new URL(request.url).searchParams.get("proposalVersionId") ?? undefined;
        return { body: await dependencies.services.representationQueries.list(context.identity, context.companyId, proposalId, versionId ? identifier(versionId, "Proposal Version ID") : undefined) };
      }
      if (path.length === 3 && path[2] === "history") {
        return { body: await dependencies.services.representationQueries.history(context.identity, context.companyId, proposalId) };
      }
      if (path.length === 3 && path[2] === "current") {
        return { body: await dependencies.services.representationQueries.current(context.identity, context.companyId, proposalId, representationType(new URL(request.url).searchParams.get("type"))) };
      }
      const representationId = identifier(path[2], "Representation ID");
      if (path.length === 3) {
        return { body: await dependencies.services.representationQueries.detail(context.identity, context.companyId, proposalId, representationId) };
      }
      if (path.length === 4 && path[3] === "download") {
        const artifact = await dependencies.services.representationQueries.content(context.identity, context.companyId, proposalId, representationId);
        const extension = artifact.type === "HTML" ? "html" : "pdf";
        return new Response(Buffer.from(artifact.content), {
          headers: {
            "content-type": artifact.contentType,
            "content-disposition": `attachment; filename="proposal-${proposalId}-${representationId}.${extension}"`,
            "x-content-type-options": "nosniff"
          }
        });
      }
    }
    if (request.method === "GET" && path.length === 1) {
      return { body: await dependencies.services.queries.load(context.identity, context.companyId, proposalId) };
    }
    if (request.method === "GET" && path.length === 2) {
      if (path[1] === "edit") return { body: await dependencies.services.queries.edit(context.identity, context.companyId, proposalId) };
      if (path[1] === "workflow") return { body: await dependencies.services.queries.workflow(context.identity, context.companyId, proposalId) };
      if (path[1] === "history") return { body: await dependencies.services.queries.history(context.identity, context.companyId, proposalId) };
      throw new HttpValidationError("Proposal query endpoint was not found.");
    }
    if (request.method !== "POST" && request.method !== "PATCH") throw new HttpValidationError("HTTP method is not supported.");
    const body = await jsonBody(request);
    const application = dependencies.services.application;
    const command = path.slice(1).join("/");
    const input = { ...appRequest(context), expectedRevision: concurrencyRevision(body.concurrencyToken) };
    let result;
    switch (command) {
      case "draft":
        if (request.method !== "PATCH") throw new HttpValidationError("Draft updates require PATCH.");
        result = await application.updateDraft(input, proposalId, draftUpdate(body) as never);
        break;
      case "versions": result = await application.saveProposalVersion(input, proposalId, optionalText(body.revisionReason, "Revision reason", 2_000)); break;
      case "quality-review": result = await application.requestQualityReview(input, proposalId); break;
      case "pricing-version": result = await application.attachPricingVersion(input, proposalId, {
        pricingProjectId: identifier(body.pricingProjectId, "Pricing Project ID"),
        pricingVersionId: identifier(body.pricingVersionId, "Pricing Version ID")
      }); break;
      case "executive-authorization": result = await application.submitForExecutiveAuthorization(input, proposalId); break;
      case "approve": result = await application.approveProposal(input, proposalId); break;
      case "reject": result = await application.rejectProposal(input, proposalId); break;
      case "request-changes": result = await application.requestChanges(input, proposalId); break;
      case "submit/quality-review": result = await application.submitThroughQualityReview(input, proposalId); break;
      case "submit/executive-authorization": result = await application.submitThroughExecutiveAuthorization(input, proposalId, text(body.businessJustification, "Business Justification", 5_000)); break;
      case "viewed": result = await application.recordProposalViewed(input, proposalId); break;
      case "acceptances/client": result = await application.recordClientAcceptance(input, proposalId, { recipientId: identifier(body.recipientId, "Recipient ID"), notes: optionalText(body.notes, "Acceptance notes", 5_000) }); break;
      case "acceptances/verbal": result = await application.recordVerbalAcceptance(input, proposalId, { recipientId: identifier(body.recipientId, "Recipient ID"), reason: text(body.reason, "Acceptance reason", 2_000), notes: text(body.notes, "Acceptance notes", 5_000) }); break;
      case "acceptances/withdraw": result = await application.withdrawAcceptance(input, proposalId, text(body.reason, "Withdrawal reason", 2_000)); break;
      case "agreement": result = await application.linkExecutedAgreement(input, proposalId, identifier(body.agreementId, "Agreement ID")); break;
      case "decline": result = await application.declineProposal(input, proposalId); break;
      case "expire": result = await application.expireProposal(input, proposalId); break;
      case "replacements": result = await application.createReplacementProposal(input, proposalId, {
        ownerId: body.ownerId === undefined ? undefined : identifier(body.ownerId, "Owner ID"),
        title: optionalText(body.title, "Proposal title", 200),
        expirationAt: body.expirationAt === undefined ? undefined : isoTimestamp(body.expirationAt, "Expiration timestamp"),
        expirationOverrideReason: optionalText(body.expirationOverrideReason, "Expiration override reason", 2_000)
      }); break;
      case "supersede": result = await application.supersedeOriginalProposal(input, proposalId, proposalIdentifier(body.replacementProposalId, "Replacement Proposal ID")); break;
      case "archive": result = await application.archiveProposal(input, proposalId); break;
      default: throw new HttpValidationError("Proposal command endpoint was not found.");
    }
    const proposal = await dependencies.services.queries.load(context.identity, context.companyId, result.aggregate.state.id);
    return { body: commandResponse(proposal, result.idempotentReplay) };
  });
}
