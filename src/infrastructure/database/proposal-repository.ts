import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ProposalAggregate,
  type PersistedProposalState
} from "@/domain/proposals/proposal-domain";
import {
  engagementTypePolicy,
  type ConsultingEngagementTypeCode
} from "@/domain/proposals/engagement-type-policies";
import { prisma } from "@/infrastructure/database/prisma";

const transactionOptions = { maxWait: 15_000, timeout: 15_000 } as const;

function json(value: unknown): Prisma.InputJsonValue {
  return structuredClone(value) as Prisma.InputJsonValue;
}

function proposalNumber(value: bigint) {
  return `PRO-${value.toString().padStart(6, "0")}`;
}

export class ProposalConcurrencyError extends Error {
  constructor() {
    super("Proposal changed since it was loaded.");
    this.name = "ProposalConcurrencyError";
  }
}

export function createPrismaProposalRepository(client: PrismaClient = prisma) {
  return {
    async allocateProposalIdentity() {
      return client.$transaction(async (transaction) => {
        const sequence = await transaction.proposalSequence.upsert({
          where: { id: "global" },
          create: { id: "global", lastValue: BigInt(1) },
          update: { lastValue: { increment: BigInt(1) } },
          select: { lastValue: true }
        });
        return { id: crypto.randomUUID(), proposalNumber: proposalNumber(sequence.lastValue) };
      }, transactionOptions);
    },

    async allocateVersionNumber(companyId: string, proposalId: string) {
      return client.$transaction(async (transaction) => {
        const updated = await transaction.proposal.updateMany({
          where: { id: proposalId, companyId },
          data: { nextVersionNumber: { increment: 1 } }
        });
        if (updated.count !== 1) throw new ProposalConcurrencyError();
        const proposal = await transaction.proposal.findFirstOrThrow({
          where: { id: proposalId, companyId }, select: { nextVersionNumber: true }
        });
        return proposal.nextVersionNumber - 1;
      }, transactionOptions);
    },

    async insert(aggregate: ProposalAggregate) {
      const state = aggregate.persistenceState;
      await client.$transaction(
        (transaction) => insertProposalInTransaction(transaction, state),
        transactionOptions
      );
    },

    async save(aggregate: ProposalAggregate, expectedUpdatedAt: string) {
      const state = aggregate.persistenceState;
      await client.$transaction(async (transaction) => {
        const updated = await transaction.proposal.updateMany({
          where: { id: state.id, companyId: state.companyId, updatedAt: new Date(expectedUpdatedAt) },
          data: mutableProposalData(state)
        });
        if (updated.count !== 1) throw new ProposalConcurrencyError();
        await appendImmutableRows(transaction, state);
      }, transactionOptions);
    },

    async findById(companyId: string, proposalId: string) {
      const row = await client.proposal.findFirst({
        where: { id: proposalId, companyId }, select: { aggregateState: true }
      });
      if (!row) return null;
      const state = row.aggregateState as unknown as PersistedProposalState;
      return ProposalAggregate.rehydrate(
        state,
        engagementTypePolicy(state.engagementTypeCode as ConsultingEngagementTypeCode)
      );
    }
  };
}

export async function insertProposalInTransaction(
  transaction: Prisma.TransactionClient,
  state: PersistedProposalState
) {
        const policy = await transaction.engagementTypePolicyVersion.findFirstOrThrow({
          where: {
            companyId: state.companyId,
            operatingGroup: { code: state.operatingGroupCode },
            code: state.engagementTypeCode,
            policyVersion: state.engagementTypePolicyVersion,
            active: true
          },
          select: { id: true, operatingGroupId: true }
        });
        const source = await transaction.pricingProject.findFirstOrThrow({
          where: {
            id: state.pricingSnapshot.pricingProjectId,
            companyId: state.companyId,
            clientId: state.clientId,
            status: "QUOTED"
          },
          select: { estimateNumber: true }
        });
        if (source.estimateNumber !== state.pricingSnapshot.pricingProjectNumber) {
          throw new ProposalConcurrencyError();
        }
        await transaction.proposal.create({
          data: proposalData(state, policy.id, policy.operatingGroupId)
        });
        await appendImmutableRows(transaction, state);
}

function mutableProposalData(state: PersistedProposalState) {
  return {
    status: state.status,
    currentVersionId: state.currentVersionId,
    submittedVersionId: state.submittedVersionId,
    effectiveAt: state.effectiveAt ? new Date(state.effectiveAt) : null,
    closedAt: state.closedAt ? new Date(state.closedAt) : null,
    revisionOpen: state.revisionOpen,
    currentAcceptanceId: state.currentAcceptanceId,
    executedAgreementId: state.executedAgreementId,
    supersededByProposalId: state.supersededByProposalId,
    draftRevision: state.draftRevision,
    versionDraftRevision: state.versionDraftRevision,
    workingDraft: json(state.workingDraft),
    pricingSnapshot: json(state.pricingSnapshot),
    aggregateState: json(state),
    updatedAt: new Date(state.updatedAt)
  };
}

function proposalData(state: PersistedProposalState, engagementTypePolicyId: string, operatingGroupId: string) {
  return {
    id: state.id,
    proposalNumber: state.proposalNumber,
    companyId: state.companyId,
    operatingGroupId,
    clientId: state.clientId,
    ownerId: state.ownerId,
    engagementTypePolicyId,
    createdAt: new Date(state.createdAt),
    ...mutableProposalData(state)
  };
}

async function appendImmutableRows(transaction: Prisma.TransactionClient, state: PersistedProposalState) {
  for (const version of state.versions) {
    const existing = await transaction.proposalVersion.findUnique({ where: { id: version.versionId } });
    if (existing) continue;
    await transaction.proposalVersion.create({
      data: {
        id: version.versionId,
        proposalId: state.id,
        companyId: state.companyId,
        versionNumber: version.versionNumber,
        createdAt: new Date(version.createdAt),
        createdByUserId: version.createdByUserId,
        predecessorVersionId: version.predecessorVersionId,
        revisionReason: version.revisionReason,
        draft: json(version.draft),
        pricingSource: { create: {
          pricingProjectId: version.pricingSnapshot.pricingProjectId,
          pricingProjectNumber: version.pricingSnapshot.pricingProjectNumber,
          schemaVersion: version.pricingSnapshot.schemaVersion,
          snapshot: json(version.pricingSnapshot)
        } }
      }
    });
  }
  for (const event of state.events) {
    const payload = json(event);
    await transaction.proposalEvent.createMany({ data: [{
      eventId: event.eventId, proposalId: state.id, companyId: state.companyId,
      clientId: state.clientId, occurredAt: new Date(event.occurredAt),
      eventType: event.eventType, eventSchemaVersion: event.eventSchemaVersion, payload
    }], skipDuplicates: true });
    await transaction.businessEventOutbox.createMany({ data: [{
      eventId: event.eventId, proposalId: state.id, companyId: state.companyId,
      clientId: state.clientId, occurredAt: new Date(event.occurredAt),
      eventType: event.eventType, payload
    }], skipDuplicates: true });
  }
}
