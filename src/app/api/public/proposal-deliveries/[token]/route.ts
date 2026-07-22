import { createProductionProposalServices } from "@/infrastructure/proposal-production-composition";
import { handlePublicProposalDelivery } from "@/interfaces/http/proposals/proposal-delivery-public-http";

export const dynamic = "force-dynamic";
let service: ReturnType<typeof createProductionProposalServices>["publicDeliveries"] | undefined;
let decisions: ReturnType<typeof createProductionProposalServices>["publicDecisions"] | undefined;

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  service ??= createProductionProposalServices().publicDeliveries;
  decisions ??= createProductionProposalServices().publicDecisions;
  return handlePublicProposalDelivery(request, (await context.params).token, service, undefined, undefined, decisions);
}
