import { getServerSession } from "next-auth";
import { getAuthenticatedIdentityFromSession } from "@/application/session/authenticated-identity";
import { authOptions } from "@/infrastructure/auth/auth-options";
import { createProductionProposalServices } from "@/infrastructure/proposal-production-composition";
import { handleSignatureHttp } from "@/interfaces/http/agreements/signature-http";
import { handleExecutionHttp } from "@/interfaces/http/agreements/execution-http";
export const dynamic = "force-dynamic";
let services: ReturnType<typeof createProductionProposalServices> | undefined;
async function run(request: Request, context: { params: Promise<{ path: string[] }> }) {
  services ??= createProductionProposalServices(); const path = (await context.params).path;
  const authenticate = async () => getAuthenticatedIdentityFromSession(await getServerSession(authOptions));
  return path[1] === "execute" || path[1] === "execution" || path[1] === "executions" ? handleExecutionHttp(request, path, { authenticate, services }) : handleSignatureHttp(request, path, { authenticate, services });
}
export const GET = run; export const POST = run;
