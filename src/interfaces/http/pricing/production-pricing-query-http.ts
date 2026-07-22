import { getServerSession } from "next-auth";
import { PricingQueryService } from "@/application/pricing/pricing-query-service";
import { DefaultPricingCapabilityEvaluator } from "@/application/pricing/pricing-capabilities";
import { getAuthenticatedIdentityFromSession } from "@/application/session/authenticated-identity";
import { authOptions } from "@/infrastructure/auth/auth-options";
import {
  createPrismaProposalActorContextProvider,
  createPrismaProposalAuthorityProvider
} from "@/infrastructure/database/proposal-authority-adapters";
import { createPrismaPricingReadRepository } from "@/infrastructure/database/pricing-read-repository";
import { prisma } from "@/infrastructure/database/prisma";
import type { PricingQueryHttpDependencies } from "@/interfaces/http/pricing/pricing-query-http-adapter";

let queries: PricingQueryService | undefined;

export function productionPricingQueryHttpDependencies(): PricingQueryHttpDependencies {
  queries ??= new PricingQueryService(
    createPrismaProposalActorContextProvider(prisma),
    new DefaultPricingCapabilityEvaluator(createPrismaProposalAuthorityProvider(prisma)),
    createPrismaPricingReadRepository(prisma)
  );
  return {
    authenticate: async () => getAuthenticatedIdentityFromSession(await getServerSession(authOptions)),
    queries
  };
}
