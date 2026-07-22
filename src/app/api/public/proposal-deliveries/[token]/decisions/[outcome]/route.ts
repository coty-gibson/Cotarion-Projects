import { createProductionProposalServices } from "@/infrastructure/proposal-production-composition";
import { handlePublicProposalDecision } from "@/interfaces/http/proposals/proposal-client-decision-public-http";
export const dynamic = "force-dynamic";
let service: ReturnType<typeof createProductionProposalServices>["publicDecisions"] | undefined;
export async function POST(request: Request, context: { params: Promise<{ token: string; outcome: string }> }) { service ??= createProductionProposalServices().publicDecisions; const params = await context.params; return handlePublicProposalDecision(request, params.token, params.outcome, service); }
