import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";

export interface ProposalRepresentationMetadataInput {
  id: string;
  proposalId: string;
  proposalVersionId: string;
  representationType: "WEB" | "PDF" | "EMAIL";
  rendererVersion: string;
  contentChecksum: string;
  storageReference?: string | null;
  generatedAt: Date;
}

export interface ProposalDeliveryAttemptInput {
  id: string;
  representationId: string;
  channel: "EMAIL" | "INTERNAL_WEB" | "PDF";
  recipientAddress: string;
  providerReference?: string | null;
  status: string;
  attemptedAt: Date;
  errorCode?: string | null;
}

export function createPrismaProposalRepresentationRepository(client: PrismaClient = prisma) {
  return {
    async appendRepresentation(companyId: string, input: ProposalRepresentationMetadataInput) {
      return client.proposalRepresentation.create({ data: { companyId, ...input } });
    },
    async appendDeliveryAttempt(companyId: string, input: ProposalDeliveryAttemptInput) {
      return client.proposalDeliveryAttempt.create({ data: { companyId, ...input } });
    },
    async listForVersion(companyId: string, proposalVersionId: string) {
      return client.proposalRepresentation.findMany({
        where: { companyId, proposalVersionId }, orderBy: [{ generatedAt: "asc" }, { id: "asc" }]
      });
    }
  };
}
