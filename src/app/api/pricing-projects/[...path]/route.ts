import { handlePricingResource } from "@/interfaces/http/pricing/pricing-http-adapter";
import { productionPricingHttpDependencies } from "@/interfaces/http/pricing/production-pricing-http";
import { handlePricingDetailQuery } from "@/interfaces/http/pricing/pricing-query-http-adapter";
import { productionPricingQueryHttpDependencies } from "@/interfaces/http/pricing/production-pricing-query-http";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  return handlePricingDetailQuery(request, (await context.params).path, productionPricingQueryHttpDependencies());
}

export async function POST(request: Request, context: RouteContext) {
  return handlePricingResource(request, (await context.params).path, productionPricingHttpDependencies());
}

export async function PATCH(request: Request, context: RouteContext) {
  return handlePricingResource(request, (await context.params).path, productionPricingHttpDependencies());
}
