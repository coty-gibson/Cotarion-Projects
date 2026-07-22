import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import type { AgreementExecutionService } from "@/application/agreements/execution-service";
import type { AgreementExecutionQueryService } from "@/application/agreements/execution-query-service";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export interface ExecutionHttpDependencies { authenticate: () => Promise<AuthenticatedIdentity | null>; services: { executions: AgreementExecutionService; executionQueries: AgreementExecutionQueryService }; now?: () => Date; uuid?: () => string }
function failure(caught: unknown) { const error = caught as { code?: string; message?: string }; const status = error.code === "NOT_AUTHENTICATED" ? 401 : error.code === "CAPABILITY_DENIED" || error.code === "COMPANY_SCOPE_VIOLATION" ? 403 : error.code === "INVALID_REQUEST" ? 400 : error.code ? 409 : 500; return Response.json({ error: { code: error.code ?? "TRANSACTION_FAILURE", message: status === 500 ? "Agreement execution failed." : error.message } }, { status }); }
export async function handleExecutionHttp(request: Request, path: readonly string[], deps: ExecutionHttpDependencies) {
  try {
    const identity = await deps.authenticate(); if (!identity) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication required.");
    const companyId = request.headers.get("x-company-id"); const agreementId = path[0];
    if (!companyId || !ID.test(companyId) || !agreementId || !ID.test(agreementId)) throw new ProposalApplicationError("INVALID_REQUEST", "Company or Agreement is invalid.");
    const uuid = deps.uuid ?? crypto.randomUUID; const at = (deps.now ?? (() => new Date()))().toISOString();
    if (request.method === "POST" && path[1] === "execute") { const result = await deps.services.executions.execute(identity, companyId, { agreementId, executedAt: at, correlationId: uuid(), requestIdentity: request.headers.get("idempotency-key") ?? uuid() }); return Response.json({ data: result }, { status: result.replay ? 200 : 201 }); }
    if (request.method === "GET" && path[1] === "execution") return Response.json({ data: await deps.services.executionQueries.detail(identity, companyId, agreementId) });
    if (request.method === "GET" && path[1] === "executions") return Response.json({ data: await deps.services.executionQueries.list(identity, companyId, agreementId) });
    throw new ProposalApplicationError("INVALID_REQUEST", "Execution endpoint was not found.");
  } catch (caught) { return failure(caught); }
}
