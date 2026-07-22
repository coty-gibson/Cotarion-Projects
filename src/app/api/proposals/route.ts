import { handleProposalCollection } from "@/interfaces/http/proposals/proposal-http-adapter";
import { productionProposalHttpDependencies } from "@/interfaces/http/proposals/production-proposal-http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleProposalCollection(request, productionProposalHttpDependencies());
}

export function POST(request: Request) {
  return handleProposalCollection(request, productionProposalHttpDependencies());
}
