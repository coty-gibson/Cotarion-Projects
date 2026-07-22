import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProposalPricingVersionResolver } from "@/application/proposals/proposal-pricing-version";
import type { ProposalPricingOutputSnapshot } from "@/domain/proposals/contracts";
import { prisma } from "@/infrastructure/database/prisma";

export function createPrismaProposalPricingVersionResolver(
  client: PrismaClient | Prisma.TransactionClient = prisma
): ProposalPricingVersionResolver {
  return {
    async resolve(input) {
      const project = await client.pricingProject.findFirst({
        where: {
          id: input.pricingProjectId,
          companyId: input.companyId,
          clientId: input.clientId,
          status: "QUOTED",
          approvedVersionId: input.pricingVersionId
        },
        select: {
          id: true,
          estimateNumber: true,
          companyId: true,
          clientId: true,
          approvedAt: true,
          approvedBy: true,
          versions: {
            where: { id: input.pricingVersionId },
            take: 1
          }
        }
      });
      const version = project?.versions[0];
      if (!project || !version || !project.approvedAt || !project.approvedBy) return null;
      return {
        schemaVersion: 2,
        pricingProjectId: project.id,
        pricingVersionId: version.id,
        pricingVersionNumber: version.versionNumber,
        pricingProjectNumber: project.estimateNumber,
        companyId: project.companyId,
        clientId: project.clientId,
        operatingGroupCode: "CONSULTING",
        sourceStatus: "QUOTED",
        pricingConfigurationVersionId: version.pricingConfigurationVersionId,
        pricingConfigurationVersion: version.pricingConfigurationVersion,
        engineVersion: version.engineVersion,
        pricingModel: version.pricingModel,
        methodologyVersion: version.methodologyVersion,
        inputSnapshot: version.inputSnapshot as never,
        outputSnapshot: version.outputSnapshot as unknown as ProposalPricingOutputSnapshot,
        approvedAt: project.approvedAt.toISOString(),
        approvedByUserId: project.approvedBy,
        capturedAt: input.capturedAt
      };
    }
  };
}
