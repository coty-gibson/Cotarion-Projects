import { handlePricingCollection } from "@/interfaces/http/pricing/pricing-http-adapter";
import { productionPricingHttpDependencies } from "@/interfaces/http/pricing/production-pricing-http";
import { handlePricingListQuery } from "@/interfaces/http/pricing/pricing-query-http-adapter";
import { productionPricingQueryHttpDependencies } from "@/interfaces/http/pricing/production-pricing-query-http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handlePricingListQuery(request, productionPricingQueryHttpDependencies());
}

export function POST(request: Request) {
  return handlePricingCollection(request, productionPricingHttpDependencies());
}
