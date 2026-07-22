import { handleProposalResource } from "@/interfaces/http/proposals/proposal-http-adapter";
import { productionProposalHttpDependencies } from "@/interfaces/http/proposals/production-proposal-http";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  return handleProposalResource(request, (await context.params).path, productionProposalHttpDependencies());
}

export async function POST(request: Request, context: RouteContext) {
  return handleProposalResource(request, (await context.params).path, productionProposalHttpDependencies());
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleProposalResource(request, (await context.params).path, productionProposalHttpDependencies());
}
