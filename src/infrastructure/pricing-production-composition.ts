import type { PrismaClient } from "@prisma/client";
import { PricingApplicationService } from "@/application/pricing/pricing-application-service";
import { DefaultPricingCapabilityEvaluator } from "@/application/pricing/pricing-capabilities";
import {
  createPrismaProposalActorContextProvider,
  createPrismaProposalAuthorityProvider
} from "@/infrastructure/database/proposal-authority-adapters";
import { createPrismaPricingAggregateRepository } from "@/infrastructure/database/pricing-repository";
import { prisma } from "@/infrastructure/database/prisma";

function formatEstimateNumber(value: bigint) {
  return `PP-${value.toString().padStart(6, "0")}`;
}

export function createProductionPricingApplication(client: PrismaClient = prisma) {
  const actors = createPrismaProposalActorContextProvider(client);
  const capabilities = new DefaultPricingCapabilityEvaluator(createPrismaProposalAuthorityProvider(client));
  return new PricingApplicationService({
    actors,
    capabilities,
    repository: createPrismaPricingAggregateRepository(client),
    ids: {
      pricingProjectId: (requestId) => requestId,
      pricingVersionId: (requestId) => requestId,
      async estimateNumber() {
        const sequence = await client.pricingProjectSequence.upsert({
          where: { id: "global" },
          create: { id: "global", lastValue: BigInt(1) },
          update: { lastValue: { increment: BigInt(1) } },
          select: { lastValue: true }
        });
        return formatEstimateNumber(sequence.lastValue);
      }
    }
  });
}
