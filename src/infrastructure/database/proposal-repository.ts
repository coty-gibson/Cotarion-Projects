import { isDeepStrictEqual } from "node:util";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ProposalRepository,
  ProposalReadRepository,
  ProposalUnitOfWork
} from "@/application/proposals/proposal-repository";
import {
  ProposalAggregate,
  type PersistedProposalState,
  type ProposalVersion
} from "@/domain/proposals/proposal-domain";
import type { ProposalBusinessEventV1, ProposalPricingSnapshot } from "@/domain/proposals/contracts";
import {
  engagementTypePolicy,
  type ConsultingEngagementTypeCode
} from "@/domain/proposals/engagement-type-policies";
import { prisma } from "@/infrastructure/database/prisma";
import { createPrismaProposalPricingVersionResolver } from "@/infrastructure/database/proposal-pricing-version-resolver";

const transactionOptions = { maxWait: 15_000, timeout: 15_000 } as const;

const proposalPersistenceInclude = {
  versions: {
    include: { pricingSource: true },
    orderBy: { versionNumber: "asc" }
  },
  events: { orderBy: [{ occurredAt: "asc" }, { eventId: "asc" }] }
} satisfies Prisma.ProposalInclude;

type ProposalPersistenceRow = Prisma.ProposalGetPayload<{
  include: typeof proposalPersistenceInclude;
}>;

function json(value: unknown): Prisma.InputJsonValue {
  return structuredClone(value) as Prisma.InputJsonValue;
}

function proposalNumber(value: bigint) {
  return `PRO-${value.toString().padStart(6, "0")}`;
}

async function allocateProposalIdentity(client: Prisma.TransactionClient | PrismaClient) {
  const sequence = await client.proposalSequence.upsert({
    where: { id: "global" },
    create: { id: "global", lastValue: BigInt(1) },
    update: { lastValue: { increment: BigInt(1) } },
    select: { lastValue: true }
  });
  return { id: crypto.randomUUID(), proposalNumber: proposalNumber(sequence.lastValue) };
}

export class ProposalConcurrencyError extends Error {
  constructor() {
    super("Proposal changed since it was loaded.");
    this.name = "ProposalConcurrencyError";
  }
}

export class ProposalImmutableConflictError extends Error {
  constructor(recordType: "Version" | "Event" | "Outbox", recordId: string) {
    super(`Immutable Proposal ${recordType} ${recordId} conflicts with persisted history.`);
    this.name = "ProposalImmutableConflictError";
  }
}

export class ProposalPersistenceMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalPersistenceMappingError";
  }
}

export function createPrismaProposalRepository(
  client: PrismaClient = prisma
): ProposalRepository {
  return {
    async allocateProposalIdentity() {
      return client.$transaction(
        (transaction) => allocateProposalIdentity(transaction),
        transactionOptions
      );
    },

    async insert(aggregate) {
      const state = aggregate.persistenceState;
      return client.$transaction(
        (transaction) => insertProposalInTransaction(transaction, state),
        transactionOptions
      );
    },

    async save(aggregate, expectedRevision) {
      const state = aggregate.persistenceState;
      return client.$transaction(
        (transaction) => saveProposalInTransaction(transaction, state, expectedRevision),
        transactionOptions
      );
    },

    async findById(companyId, proposalId) {
      return findProposalInPersistence(client, companyId, proposalId);
    },

    async findByEventId(companyId, eventId) {
      return findProposalByEventInPersistence(client, companyId, eventId);
    },

    async list(companyId, request) {
      return listProposalsInPersistence(client, companyId, request);
    }
  };
}

export function createPrismaProposalReadRepository(
  client: PrismaClient | Prisma.TransactionClient = prisma
): ProposalReadRepository {
  return {
    async detail(companyId, proposalId) {
      const row = await client.proposal.findFirst({
        where: { id: proposalId, companyId },
        select: { aggregateState: true, aggregateRevision: true }
      });
      if (!row) return null;
      return {
        state: structuredClone(row.aggregateState) as unknown as PersistedProposalState,
        revision: row.aggregateRevision
      };
    },
    list: (companyId, request) => listProposalsInPersistence(client, companyId, request)
  };
}

function createTransactionalProposalRepository(
  transaction: Prisma.TransactionClient
): ProposalRepository {
  return {
    allocateProposalIdentity: () => allocateProposalIdentity(transaction),
    insert: (aggregate) => insertProposalInTransaction(transaction, aggregate.persistenceState),
    save: (aggregate, expectedRevision) =>
      saveProposalInTransaction(transaction, aggregate.persistenceState, expectedRevision),
    findById: (companyId, proposalId) =>
      findProposalInPersistence(transaction, companyId, proposalId),
    findByEventId: (companyId, eventId) =>
      findProposalByEventInPersistence(transaction, companyId, eventId),
    list: (companyId, request) => listProposalsInPersistence(transaction, companyId, request)
  };
}

function encodeCursor(updatedAt: Date, id: string) {
  return Buffer.from(JSON.stringify([updatedAt.toISOString(), id]), "utf8").toString("base64url");
}

function decodeCursor(cursor: string) {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "string" || typeof value[1] !== "string") throw new Error();
    const updatedAt = new Date(value[0]);
    if (!Number.isFinite(updatedAt.getTime()) || !value[1]) throw new Error();
    return { updatedAt, id: value[1] };
  } catch {
    throw new ProposalPersistenceMappingError("Proposal pagination cursor is invalid.");
  }
}

export async function listProposalsInPersistence(
  reader: ProposalPersistenceReader,
  companyId: string,
  request: import("@/application/proposals/proposal-repository").ProposalListPageRequest
) {
  const cursor = request.cursor ? decodeCursor(request.cursor) : null;
  const rows = await reader.proposal.findMany({
    where: {
      companyId,
      status: request.filter?.status as Prisma.EnumProposalStatusFilter | undefined,
      clientId: request.filter?.clientId,
      ownerId: request.filter?.ownerId,
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: cursor.updatedAt } },
              { updatedAt: cursor.updatedAt, id: { lt: cursor.id } }
            ]
          }
        : {})
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: request.limit + 1,
    select: {
      id: true,
      proposalNumber: true,
      companyId: true,
      clientId: true,
      ownerId: true,
      status: true,
      workingDraft: true,
      createdAt: true,
      updatedAt: true,
      effectiveAt: true,
      closedAt: true,
      currentVersion: { select: { versionNumber: true } },
      submittedVersion: { select: { versionNumber: true } },
      _count: { select: { versions: true } }
    }
  });
  const hasMore = rows.length > request.limit;
  const pageRows = rows.slice(0, request.limit);
  return {
    items: pageRows.map((row) => {
      const draft = row.workingDraft as { title?: unknown };
      if (typeof draft.title !== "string") {
        throw new ProposalPersistenceMappingError(`Proposal ${row.id} Draft title is invalid.`);
      }
      return {
        id: row.id,
        proposalNumber: row.proposalNumber,
        companyId: row.companyId,
        clientId: row.clientId,
        ownerId: row.ownerId,
        title: draft.title,
        status: row.status,
        currentVersionNumber: row.currentVersion?.versionNumber ?? null,
        submittedVersionNumber: row.submittedVersion?.versionNumber ?? null,
        versionCount: row._count.versions,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        effectiveAt: row.effectiveAt?.toISOString() ?? null,
        closedAt: row.closedAt?.toISOString() ?? null
      };
    }),
    nextCursor:
      hasMore && pageRows.length
        ? encodeCursor(pageRows.at(-1)!.updatedAt, pageRows.at(-1)!.id)
        : null
  };
}

export function createPrismaProposalUnitOfWork(
  client: PrismaClient = prisma
): ProposalUnitOfWork {
  return {
    execute(work) {
      return client.$transaction(
        (transaction) => work(
          createTransactionalProposalRepository(transaction),
          createPrismaProposalPricingVersionResolver(transaction)
        ),
        transactionOptions
      );
    }
  };
}

export function createProposalTransactionScope(
  transaction: Prisma.TransactionClient,
  includePricingResolver = false
): ProposalUnitOfWork {
  return {
    execute(work) {
      return work(
        createTransactionalProposalRepository(transaction),
        includePricingResolver
          ? createPrismaProposalPricingVersionResolver(transaction)
          : undefined
      );
    }
  };
}

export async function saveProposalInTransaction(
  transaction: Prisma.TransactionClient,
  state: PersistedProposalState,
  expectedRevision: number
) {
  const claimed = await transaction.proposal.updateMany({
    where: {
      id: state.id,
      companyId: state.companyId,
      aggregateRevision: expectedRevision
    },
    data: { aggregateRevision: { increment: 1 } }
  });
  if (claimed.count !== 1) throw new ProposalConcurrencyError();

  await appendImmutableRows(transaction, state);
  await transaction.proposal.update({
    where: { id: state.id },
    data: mutableProposalData(state)
  });
  return { revision: expectedRevision + 1 };
}

type ProposalPersistenceReader = Pick<PrismaClient, "proposal"> | Prisma.TransactionClient;

export async function findProposalInPersistence(
  reader: ProposalPersistenceReader,
  companyId: string,
  proposalId: string
) {
  const row = await reader.proposal.findFirst({
    where: { id: proposalId, companyId },
    include: proposalPersistenceInclude
  });
  if (!row) return null;
  const state = mapProposalRowToState(row);
  return {
    aggregate: ProposalAggregate.rehydrate(
      state,
      engagementTypePolicy(state.engagementTypeCode as ConsultingEngagementTypeCode)
    ),
    revision: row.aggregateRevision
  };
}

export async function findProposalByEventInPersistence(
  reader: ProposalPersistenceReader & Pick<PrismaClient, "proposalEvent">,
  companyId: string,
  eventId: string
) {
  const event = await reader.proposalEvent.findFirst({
    where: { eventId, companyId },
    select: { proposalId: true }
  });
  return event
    ? findProposalInPersistence(reader, companyId, event.proposalId)
    : null;
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
    throw new ProposalPersistenceMappingError("Pricing Project number does not match snapshot.");
  }

  await transaction.proposal.create({
    data: {
      ...proposalData(state, policy.id, policy.operatingGroupId),
      currentVersionId: null,
      submittedVersionId: null,
      aggregateRevision: 0
    }
  });
  await appendImmutableRows(transaction, state);
  await transaction.proposal.update({
    where: { id: state.id },
    data: mutableProposalData(state)
  });
  return { revision: 0 };
}

function mutableProposalData(state: PersistedProposalState) {
  return {
    status: state.status,
    currentVersionId: state.currentVersionId,
    submittedVersionId: state.submittedVersionId,
    qualityReviewRequestedByUserId: state.qualityReviewRequestedByUserId,
    effectiveAt: state.effectiveAt ? new Date(state.effectiveAt) : null,
    closedAt: state.closedAt ? new Date(state.closedAt) : null,
    revisionOpen: state.revisionOpen,
    currentAcceptanceId: state.currentAcceptanceId,
    executedAgreementId: state.executedAgreementId,
    supersededByProposalId: state.supersededByProposalId,
    supersedesProposalId: state.supersedesProposalId,
    draftRevision: state.draftRevision,
    versionDraftRevision: state.versionDraftRevision,
    workingDraft: json(state.workingDraft),
    pricingSnapshot: json(state.pricingSnapshot),
    aggregateState: json(state),
    updatedAt: new Date(state.updatedAt)
  };
}

function proposalData(
  state: PersistedProposalState,
  engagementTypePolicyId: string,
  operatingGroupId: string
) {
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

async function appendImmutableRows(
  transaction: Prisma.TransactionClient,
  state: PersistedProposalState
) {
  for (const version of state.versions) {
    const existing = await transaction.proposalVersion.findUnique({
      where: { id: version.versionId },
      include: { pricingSource: true }
    });
    if (existing) {
      const stored = mapVersionRow(existing);
      if (!isDeepStrictEqual(stored, version)) {
        throw new ProposalImmutableConflictError("Version", version.versionId);
      }
      continue;
    }
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
        pricingSource: {
          create: {
            pricingProjectId: version.pricingSnapshot.pricingProjectId,
            pricingProjectNumber: version.pricingSnapshot.pricingProjectNumber,
            schemaVersion: version.pricingSnapshot.schemaVersion,
            snapshot: json(version.pricingSnapshot)
          }
        }
      }
    });
  }

  for (const event of state.events) {
    await appendEvent(transaction, state, event);
  }
}

async function appendEvent(
  transaction: Prisma.TransactionClient,
  state: PersistedProposalState,
  event: ProposalBusinessEventV1
) {
  const payload = structuredClone(event);
  const existingEvent = await transaction.proposalEvent.findUnique({
    where: { eventId: event.eventId }
  });
  if (existingEvent) {
    if (
      existingEvent.proposalId !== state.id ||
      existingEvent.companyId !== state.companyId ||
      !isDeepStrictEqual(existingEvent.payload, payload)
    ) {
      throw new ProposalImmutableConflictError("Event", event.eventId);
    }
  } else {
    await transaction.proposalEvent.create({
      data: {
        eventId: event.eventId,
        proposalId: state.id,
        companyId: state.companyId,
        clientId: state.clientId,
        occurredAt: new Date(event.occurredAt),
        eventType: event.eventType,
        eventSchemaVersion: event.eventSchemaVersion,
        payload: json(payload)
      }
    });
  }

  const existingOutbox = await transaction.businessEventOutbox.findUnique({
    where: { eventId: event.eventId }
  });
  if (existingOutbox) {
    if (
      existingOutbox.proposalId !== state.id ||
      existingOutbox.companyId !== state.companyId ||
      !isDeepStrictEqual(existingOutbox.payload, payload)
    ) {
      throw new ProposalImmutableConflictError("Outbox", event.eventId);
    }
  } else {
    await transaction.businessEventOutbox.create({
      data: {
        eventId: event.eventId,
        proposalId: state.id,
        companyId: state.companyId,
        clientId: state.clientId,
        occurredAt: new Date(event.occurredAt),
        eventType: event.eventType,
        payload: json(payload)
      }
    });
  }
}

function mapVersionRow(
  row: ProposalPersistenceRow["versions"][number]
): ProposalVersion {
  if (!row.pricingSource) {
    throw new ProposalPersistenceMappingError(
      `Proposal Version ${row.id} has no Pricing source snapshot.`
    );
  }
  return {
    versionId: row.id,
    proposalId: row.proposalId,
    versionNumber: row.versionNumber,
    createdAt: row.createdAt.toISOString(),
    createdByUserId: row.createdByUserId,
    predecessorVersionId: row.predecessorVersionId,
    revisionReason: row.revisionReason,
    draft: structuredClone(row.draft) as unknown as ProposalVersion["draft"],
    pricingSnapshot: structuredClone(
      row.pricingSource.snapshot
    ) as unknown as ProposalPricingSnapshot
  };
}

export function mapProposalRowToState(row: ProposalPersistenceRow): PersistedProposalState {
  const snapshot = structuredClone(row.aggregateState) as unknown as PersistedProposalState;
  if (
    snapshot.id !== row.id ||
    snapshot.companyId !== row.companyId ||
    snapshot.clientId !== row.clientId ||
    snapshot.proposalNumber !== row.proposalNumber
  ) {
    throw new ProposalPersistenceMappingError(
      "Proposal aggregate snapshot identity conflicts with relational identity."
    );
  }

  const versions = row.versions.map(mapVersionRow);
  const storedEvents = new Map(
    row.events.map(({ eventId, payload }) => [
      eventId,
      structuredClone(payload) as unknown as ProposalBusinessEventV1
    ])
  );
  if (storedEvents.size !== snapshot.events.length) {
    throw new ProposalPersistenceMappingError(
      "Proposal event snapshot count conflicts with append-only event rows."
    );
  }
  const events = snapshot.events.map((event) => {
    const stored = storedEvents.get(event.eventId);
    if (!stored) {
      throw new ProposalPersistenceMappingError(
        `Proposal event ${event.eventId} is missing from append-only history.`
      );
    }
    return stored;
  });
  const state: PersistedProposalState = {
    ...snapshot,
    status: row.status,
    currentVersionId: row.currentVersionId,
    submittedVersionId: row.submittedVersionId,
    qualityReviewRequestedByUserId: row.qualityReviewRequestedByUserId,
    effectiveAt: row.effectiveAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    revisionOpen: row.revisionOpen,
    currentAcceptanceId: row.currentAcceptanceId,
    executedAgreementId: row.executedAgreementId,
    supersededByProposalId: row.supersededByProposalId,
    supersedesProposalId: row.supersedesProposalId,
    draftRevision: row.draftRevision,
    versionDraftRevision: row.versionDraftRevision,
    workingDraft: structuredClone(row.workingDraft) as unknown as PersistedProposalState["workingDraft"],
    pricingSnapshot: structuredClone(row.pricingSnapshot) as unknown as ProposalPricingSnapshot,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    versions,
    events
  };

  if (!isDeepStrictEqual(state, snapshot)) {
    throw new ProposalPersistenceMappingError(
      "Proposal aggregate snapshot conflicts with normalized persistence records."
    );
  }
  return state;
}
