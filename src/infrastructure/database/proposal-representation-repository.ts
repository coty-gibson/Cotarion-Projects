import { Prisma, type PrismaClient } from "@prisma/client";
import type { ProposalRepresentationRepository, ProposalRepresentationRecord } from "@/application/proposals/proposal-representation-repository";
import type { ProposalPricingSnapshot } from "@/domain/proposals/contracts";
import type { ProposalWorkingDraft } from "@/domain/proposals/proposal-domain";
import { prisma } from "@/infrastructure/database/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

function mapRecord(row: {
  id: string; companyId: string; proposalId: string; proposalVersionId: string;
  representationType: string; representationVersion: number; rendererVersion: string;
  representationStatus: string; contentChecksum: string; contentType: string;
  generatedContent: Uint8Array; metadata: unknown; generatedAt: Date; generatedByUserId: string;
  proposalVersion: { versionNumber: number };
}): ProposalRepresentationRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    proposalId: row.proposalId,
    proposalVersionId: row.proposalVersionId,
    proposalVersionNumber: row.proposalVersion.versionNumber,
    representationType: row.representationType as ProposalRepresentationRecord["representationType"],
    representationVersion: row.representationVersion,
    rendererVersion: row.rendererVersion,
    representationStatus: row.representationStatus as ProposalRepresentationRecord["representationStatus"],
    contentChecksum: row.contentChecksum,
    contentType: row.contentType,
    generatedContent: new Uint8Array(row.generatedContent),
    metadata: structuredClone(row.metadata) as ProposalRepresentationRecord["metadata"],
    generatedAt: row.generatedAt.toISOString(),
    generatedByUserId: row.generatedByUserId
  };
}

const representationInclude = { proposalVersion: { select: { versionNumber: true } } } as const;

export function createPrismaProposalRepresentationRepository(client: Client = prisma): ProposalRepresentationRepository {
  return {
    async findVersionSource(companyId, proposalId, proposalVersionId) {
      const version = await client.proposalVersion.findFirst({
        where: { id: proposalVersionId, proposalId, companyId },
        select: {
          id: true,
          proposalId: true,
          companyId: true,
          versionNumber: true,
          draft: true,
          pricingSource: { select: { snapshot: true } },
          proposal: { select: { proposalNumber: true } }
        }
      });
      if (!version?.pricingSource) return null;
      return {
        companyId: version.companyId,
        proposalId: version.proposalId,
        proposalNumber: version.proposal.proposalNumber,
        proposalVersionId: version.id,
        proposalVersionNumber: version.versionNumber,
        draft: structuredClone(version.draft) as unknown as ProposalWorkingDraft,
        pricingSnapshot: structuredClone(version.pricingSource.snapshot) as unknown as ProposalPricingSnapshot
      };
    },

    async insertOrGet(input) {
      const inserted = await client.proposalRepresentation.createMany({
        data: [{
            id: input.id,
            companyId: input.companyId,
            proposalId: input.proposalId,
            proposalVersionId: input.proposalVersionId,
            representationType: input.representationType,
            representationVersion: input.representationVersion,
            rendererVersion: input.rendererVersion,
            representationStatus: input.representationStatus,
            contentChecksum: input.contentChecksum,
            contentType: input.contentType,
            generatedContent: Buffer.from(input.generatedContent),
            metadata: input.metadata as Prisma.InputJsonValue,
            generatedAt: new Date(input.generatedAt),
            generatedByUserId: input.generatedByUserId,
            storageReference: null
          }],
        skipDuplicates: true
      });
      const existing = await client.proposalRepresentation.findFirst({
          where: {
            companyId: input.companyId,
            proposalVersionId: input.proposalVersionId,
            representationType: input.representationType,
            representationVersion: input.representationVersion
          },
          include: representationInclude
      });
      if (!existing || existing.id !== input.id || existing.contentChecksum !== input.contentChecksum || existing.rendererVersion !== input.rendererVersion) {
        throw new Error("Proposal Representation identity conflicts with different generated content.");
      }
      return { record: mapRecord(existing), idempotentReplay: inserted.count === 0 };
    },

    async list(companyId, proposalId, proposalVersionId) {
      const rows = await client.proposalRepresentation.findMany({
        where: { companyId, proposalId, proposalVersionId },
        orderBy: [{ generatedAt: "desc" }, { id: "desc" }],
        include: representationInclude
      });
      return rows.map(mapRecord);
    },

    async detail(companyId, proposalId, representationId) {
      const row = await client.proposalRepresentation.findFirst({
        where: { id: representationId, companyId, proposalId },
        include: representationInclude
      });
      return row ? mapRecord(row) : null;
    },

    async current(companyId, proposalId, representationType) {
      const proposal = await client.proposal.findFirst({ where: { id: proposalId, companyId }, select: { currentVersionId: true } });
      if (!proposal?.currentVersionId) return null;
      const row = await client.proposalRepresentation.findFirst({
        where: { companyId, proposalId, proposalVersionId: proposal.currentVersionId, representationType },
        orderBy: [{ representationVersion: "desc" }],
        include: representationInclude
      });
      return row ? mapRecord(row) : null;
    }
  };
}
