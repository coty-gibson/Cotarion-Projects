import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { PricingApplicationError } from "@/application/pricing/pricing-application-errors";
import type { PricingQueryService } from "@/application/pricing/pricing-query-service";
import type { PricingModelType } from "@/domain/pricing/types";
import type { PricingProjectLifecycleStatus } from "@/domain/pricing/pricing-project";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set<PricingProjectLifecycleStatus>(["DRAFT", "IN_REVIEW", "QUOTED", "ARCHIVED"]);
const MODELS = new Set<PricingModelType>(["PROJECT", "FIXED_RETAINER", "PROFIT_SHARE_RETAINER", "HYBRID_RETAINER", "ADVISORY_HOURLY"]);
const SORTS = new Set(["lastUpdated", "estimateNumber", "projectName", "status", "pricingModel"]);

export interface PricingQueryHttpDependencies {
  readonly authenticate: () => Promise<AuthenticatedIdentity | null>;
  readonly queries: PricingQueryService;
  readonly randomUUID?: () => string;
}

class QueryValidationError extends Error {}

function integer(value: string | null, fallback: number, field: string, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === null) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) throw new QueryValidationError(`${field} is invalid.`);
  return number;
}

function errorResponse(error: unknown, correlationId: string) {
  if (error instanceof QueryValidationError) return Response.json({ error: { code: "INVALID_REQUEST", message: error.message }, correlationId }, { status: 400 });
  if (error instanceof PricingApplicationError) {
    const status = error.code === "NOT_AUTHENTICATED" ? 401
      : error.code === "COMPANY_SCOPE_VIOLATION" || error.code === "CAPABILITY_DENIED" ? 403
      : error.code === "PRICING_PROJECT_NOT_FOUND" ? 404
      : error.code === "INVALID_REQUEST" ? 400 : 500;
    return Response.json({ error: { code: error.code, message: status === 500 ? "Pricing query failed." : error.message }, correlationId }, { status });
  }
  return Response.json({ error: { code: "TRANSACTION_FAILURE", message: "Pricing query failed." }, correlationId }, { status: 500 });
}

async function execute(
  request: Request,
  dependencies: PricingQueryHttpDependencies,
  handler: (identity: AuthenticatedIdentity, companyId: string) => Promise<unknown>
) {
  const correlationId = request.headers.get("x-correlation-id") ?? (dependencies.randomUUID ?? crypto.randomUUID)();
  if (!UUID.test(correlationId)) return errorResponse(new QueryValidationError("Correlation ID must be a UUID."), (dependencies.randomUUID ?? crypto.randomUUID)());
  try {
    if (request.method !== "GET") throw new QueryValidationError("HTTP method is not supported.");
    const identity = await dependencies.authenticate();
    if (!identity) throw new PricingApplicationError("NOT_AUTHENTICATED", "Authentication is required.");
    const companyId = request.headers.get("x-company-id");
    if (!companyId || !IDENTIFIER.test(companyId)) throw new QueryValidationError("Company ID is invalid.");
    return Response.json({ data: await handler(identity, companyId), correlationId });
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}

export function handlePricingListQuery(request: Request, dependencies: PricingQueryHttpDependencies) {
  return execute(request, dependencies, async (identity, companyId) => {
    const parameters = new URL(request.url).searchParams;
    const status = parameters.get("status");
    const pricingModel = parameters.get("pricingModel");
    const sortBy = parameters.get("sortBy") ?? "lastUpdated";
    const sortDirection = parameters.get("sortDirection") ?? "desc";
    if (status && !STATUSES.has(status as PricingProjectLifecycleStatus)) throw new QueryValidationError("Pricing status filter is invalid.");
    if (pricingModel && !MODELS.has(pricingModel as PricingModelType)) throw new QueryValidationError("Pricing Model filter is invalid.");
    if (!SORTS.has(sortBy)) throw new QueryValidationError("Pricing sort field is invalid.");
    if (sortDirection !== "asc" && sortDirection !== "desc") throw new QueryValidationError("Pricing sort direction is invalid.");
    const search = parameters.get("search")?.trim() || undefined;
    if (search && search.length > 200) throw new QueryValidationError("Pricing search is invalid.");
    return dependencies.queries.list(identity, companyId, {
      page: integer(parameters.get("page"), 1, "Page"),
      pageSize: integer(parameters.get("pageSize"), 25, "Page size", 100),
      search,
      status: status as PricingProjectLifecycleStatus | undefined,
      pricingModel: pricingModel as PricingModelType | undefined,
      sortBy: sortBy as "lastUpdated" | "estimateNumber" | "projectName" | "status" | "pricingModel",
      sortDirection
    });
  });
}

export function handlePricingDetailQuery(request: Request, path: readonly string[], dependencies: PricingQueryHttpDependencies) {
  return execute(request, dependencies, async (identity, companyId) => {
    if (!path[0] || !UUID.test(path[0])) throw new QueryValidationError("Pricing Project ID must be a UUID.");
    const resource = path[1];
    if (path.length === 1) return dependencies.queries.detail(identity, companyId, path[0]);
    if (path.length !== 2) throw new QueryValidationError("Pricing query endpoint was not found.");
    if (resource === "edit") return dependencies.queries.editableDraft(identity, companyId, path[0]);
    if (resource === "versions") return dependencies.queries.versions(identity, companyId, path[0]);
    if (resource === "reviews") return dependencies.queries.reviews(identity, companyId, path[0]);
    throw new QueryValidationError("Pricing query endpoint was not found.");
  });
}
