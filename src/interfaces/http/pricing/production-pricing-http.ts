import { getServerSession } from "next-auth";
import { getAuthenticatedIdentityFromSession } from "@/application/session/authenticated-identity";
import { authOptions } from "@/infrastructure/auth/auth-options";
import { createProductionPricingApplication } from "@/infrastructure/pricing-production-composition";
import type { PricingHttpDependencies } from "@/interfaces/http/pricing/pricing-http-adapter";

let application: ReturnType<typeof createProductionPricingApplication> | undefined;

export function productionPricingHttpDependencies(): PricingHttpDependencies {
  application ??= createProductionPricingApplication();
  return {
    authenticate: async () => getAuthenticatedIdentityFromSession(await getServerSession(authOptions)),
    application
  };
}
