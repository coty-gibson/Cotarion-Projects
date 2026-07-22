import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PersistedPricingConfigurationVersion,
  PersistedPricingProject,
  PersistedServiceCatalogItem,
  PricingConfigurationRepository,
  PricingProjectDraftData,
  PricingProjectRepository,
  ServiceCatalogRepository
} from "@/application/pricing/pricing-persistence";
import { prisma } from "@/infrastructure/database/prisma";
import {
  PricingConcurrencyError,
  PricingGovernanceError
} from "@/domain/pricing/pricing-governance-errors";
import { PricingProject, type JsonObject } from "@/domain/pricing/pricing-project";
import type { PricingGovernanceEvent } from "@/domain/pricing/pricing-governance-events";

const pricingProjectInclude = {
  lines: {
    include: { serviceCatalogItem: true },
    orderBy: { sortOrder: "asc" as const }
  },
  complexitySelections: { orderBy: { sortOrder: "asc" as const } },
  discountSelection: true
} satisfies Prisma.PricingProjectInclude;

// Legacy Phase 4 normalized adapters below are quarantined for historical
// migration compatibility. Production Pricing commands use only
// createPrismaPricingAggregateRepository; production queries use the dedicated
// pricing-read-repository. Do not compose these adapters into application flows.

type PricingProjectWithRelations = Prisma.PricingProjectGetPayload<{
  include: typeof pricingProjectInclude;
}>;

function formatEstimateNumber(value: bigint) {
  return `PP-${value.toString().padStart(6, "0")}`;
}

function mapProject(project: PricingProjectWithRelations): PersistedPricingProject {
  return {
    id: project.id,
    estimateNumber: project.estimateNumber,
    companyId: project.companyId,
    clientId: project.clientId,
    ownerId: project.ownerId,
    sourcePricingProjectId: project.sourcePricingProjectId,
    pricingConfigurationVersionId: project.pricingConfigurationVersionId,
    projectName: project.projectName,
    pricingModel: project.pricingModel,
    methodologyVersion: project.methodologyVersion,
    pricingInputSnapshot: project.pricingInputSnapshot,
    pricingOutputSnapshot: project.pricingOutputSnapshot,
    status: project.status,
    currency: project.currency,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lines: project.lines.map((line) => ({
      id: line.id,
      serviceCatalogItemId: line.serviceCatalogItemId,
      serviceCode: line.serviceCatalogItem.code,
      serviceName: line.serviceCatalogItem.name,
      basePriceMinor: line.serviceCatalogItem.basePriceMinor,
      quantity: line.quantity.toFixed(2),
      sortOrder: line.sortOrder
    })),
    complexitySelections: project.complexitySelections.map((selection) => ({
      id: selection.id,
      factorCode: selection.factorCode,
      optionCode: selection.optionCode,
      sortOrder: selection.sortOrder
    })),
    discountSelection: project.discountSelection
      ? {
          id: project.discountSelection.id,
          discountCode: project.discountSelection.discountCode,
          sortOrder: project.discountSelection.sortOrder
        }
      : null
  };
}

function lineData(companyId: string, pricingProjectId: string, input: PricingProjectDraftData) {
  return input.lines.map((line) => ({
    companyId,
    pricingProjectId,
    serviceCatalogItemId: line.serviceCatalogItemId,
    quantity: line.quantity,
    sortOrder: line.sortOrder
  }));
}

function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {};
  return value as Prisma.InputJsonValue;
}

function complexityData(
  companyId: string,
  pricingProjectId: string,
  input: PricingProjectDraftData
) {
  return input.complexitySelections.map((selection) => ({
    companyId,
    pricingProjectId,
    factorCode: selection.factorCode,
    optionCode: selection.optionCode,
    sortOrder: selection.sortOrder
  }));
}

async function findProject(
  client: PrismaClient | Prisma.TransactionClient,
  companyId: string,
  pricingProjectId: string
) {
  return client.pricingProject.findFirst({
    where: { id: pricingProjectId, companyId },
    include: pricingProjectInclude
  });
}

export function createPrismaPricingProjectRepository(
  client: PrismaClient = prisma
): PricingProjectRepository {
  return {
    async createPricingProject(companyId, input) {
      return client.$transaction(
        async (transaction) => {
          const sequence = await transaction.pricingProjectSequence.upsert({
            where: { id: "global" },
            create: { id: "global", lastValue: BigInt(1) },
            update: { lastValue: { increment: BigInt(1) } },
            select: { lastValue: true }
          });
          const project = await transaction.pricingProject.create({
            data: {
              estimateNumber: formatEstimateNumber(sequence.lastValue),
              companyId,
              clientId: input.clientId,
              ownerId: input.ownerId,
              sourcePricingProjectId: input.sourcePricingProjectId ?? null,
              pricingConfigurationVersionId: input.pricingConfigurationVersionId,
              projectName: input.projectName,
              pricingModel: input.pricingModel ?? "PROJECT",
              methodologyVersion: input.methodologyVersion ?? "project-pricing/1.0.0",
              pricingInputSnapshot: jsonSnapshot(input.pricingInputSnapshot),
              pricingOutputSnapshot: jsonSnapshot(input.pricingOutputSnapshot),
              status: "DRAFT",
              currency: "USD"
            },
            select: { id: true }
          });

          if (input.lines.length > 0) {
            await transaction.pricingProjectLine.createMany({
              data: lineData(companyId, project.id, input)
            });
          }
          if (input.complexitySelections.length > 0) {
            await transaction.pricingComplexitySelection.createMany({
              data: complexityData(companyId, project.id, input)
            });
          }
          await transaction.pricingDiscountSelection.create({
            data: {
              companyId,
              pricingProjectId: project.id,
              discountCode: input.discountSelection.discountCode,
              sortOrder: input.discountSelection.sortOrder
            }
          });

          return mapProject((await findProject(transaction, companyId, project.id))!);
        },
        { maxWait: 15_000, timeout: 15_000 }
      );
    },

    async findPricingProject(companyId, pricingProjectId) {
      const project = await findProject(client, companyId, pricingProjectId);
      return project ? mapProject(project) : null;
    },

    async listPricingProjectsForClient(companyId, clientId) {
      const projects = await client.pricingProject.findMany({
        where: { companyId, clientId },
        include: pricingProjectInclude,
        orderBy: [{ updatedAt: "desc" }, { estimateNumber: "desc" }]
      });
      return projects.map(mapProject);
    },

    async replacePricingProjectDraft(companyId, pricingProjectId, input) {
      return client.$transaction(async (transaction) => {
        const existing = await transaction.pricingProject.findFirst({
          where: { id: pricingProjectId, companyId },
          select: { id: true }
        });
        if (!existing) return null;

        await transaction.pricingProjectLine.deleteMany({ where: { pricingProjectId, companyId } });
        await transaction.pricingComplexitySelection.deleteMany({
          where: { pricingProjectId, companyId }
        });
        await transaction.pricingDiscountSelection.deleteMany({
          where: { pricingProjectId, companyId }
        });

        await transaction.pricingProject.update({
          where: { id: pricingProjectId },
          data: {
            projectName: input.projectName,
            pricingModel: input.pricingModel ?? "PROJECT",
            methodologyVersion: input.methodologyVersion ?? "project-pricing/1.0.0",
            pricingInputSnapshot: jsonSnapshot(input.pricingInputSnapshot),
            pricingOutputSnapshot: jsonSnapshot(input.pricingOutputSnapshot)
          }
        });
        if (input.lines.length > 0) {
          await transaction.pricingProjectLine.createMany({
            data: lineData(companyId, pricingProjectId, input)
          });
        }
        if (input.complexitySelections.length > 0) {
          await transaction.pricingComplexitySelection.createMany({
            data: complexityData(companyId, pricingProjectId, input)
          });
        }
        await transaction.pricingDiscountSelection.create({
          data: {
            companyId,
            pricingProjectId,
            discountCode: input.discountSelection.discountCode,
            sortOrder: input.discountSelection.sortOrder
          }
        });

        return mapProject((await findProject(transaction, companyId, pricingProjectId))!);
      });
    },

  };
}

function mapService(item: {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  basePriceMinor: bigint;
  currency: "USD";
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}): PersistedServiceCatalogItem {
  return item;
}

export function createPrismaServiceCatalogRepository(
  client: PrismaClient = prisma
): ServiceCatalogRepository {
  return {
    async listActiveServiceCatalogItems(companyId) {
      const items = await client.serviceCatalogItem.findMany({
        where: { companyId, status: "ACTIVE" },
        orderBy: { sortOrder: "asc" }
      });
      return items.map(mapService);
    },

    async findServiceCatalogItem(companyId, serviceCatalogItemId) {
      const item = await client.serviceCatalogItem.findFirst({
        where: { id: serviceCatalogItemId, companyId }
      });
      return item ? mapService(item) : null;
    }
  };
}

function mapConfiguration(version: {
  id: string;
  pricingConfigurationId: string;
  companyId: string;
  version: number;
  status: "ACTIVE" | "RETIRED";
  schemaVersion: number;
  engineVersion: string;
  currency: "USD";
  configuration: unknown;
  effectiveFrom: Date;
  createdAt: Date;
}): PersistedPricingConfigurationVersion {
  return version;
}

export function createPrismaPricingConfigurationRepository(
  client: PrismaClient = prisma
): PricingConfigurationRepository {
  return {
    async findActivePricingConfiguration(companyId) {
      const version = await client.pricingConfigurationVersion.findFirst({
        where: { companyId, status: "ACTIVE" }
      });
      return version ? mapConfiguration(version) : null;
    },

    async findPricingConfigurationVersion(companyId, pricingConfigurationVersionId) {
      const version = await client.pricingConfigurationVersion.findFirst({
        where: { id: pricingConfigurationVersionId, companyId }
      });
      return version ? mapConfiguration(version) : null;
    }
  };
}

const governanceInclude = {
  governanceDraft: true,
  versions: { orderBy: { versionNumber: "asc" as const } },
  reviewDecisions: { orderBy: [{ decidedAt: "asc" as const }, { id: "asc" as const }] },
  processedCommands: { orderBy: { commandId: "asc" as const } },
  governanceEvents: { orderBy: [{ aggregateRevision: "asc" as const }, { eventId: "asc" as const }] }
} satisfies Prisma.PricingProjectInclude;

type GovernanceProjectRow = Prisma.PricingProjectGetPayload<{ include: typeof governanceInclude }>;

export class PricingPersistenceConcurrencyError extends PricingConcurrencyError {
  constructor(expectedRevision: number, actualRevision: number) {
    super(expectedRevision, actualRevision);
  }
}

function asJsonObject(value: Prisma.JsonValue): JsonObject {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new PricingGovernanceError("VERSION_EVIDENCE_INVALID", "Persisted Pricing evidence must be a JSON object.");
  }
  return value as JsonObject;
}

function mapGovernanceAggregate(row: GovernanceProjectRow): PricingProject {
  const draft = row.governanceDraft;
  if (!draft) {
    throw new PricingGovernanceError("VERSION_EVIDENCE_INVALID", "Persisted Pricing Project is missing its Draft.");
  }
  const versionIds = new Set(row.versions.map(({ id }) => id));
  if (row.reviewCandidateVersionId && !versionIds.has(row.reviewCandidateVersionId)) {
    throw new PricingGovernanceError("REVIEW_CANDIDATE_REQUIRED", "Persisted review candidate does not belong to the aggregate.");
  }
  if (row.approvedVersionId && !versionIds.has(row.approvedVersionId)) {
    throw new PricingGovernanceError("APPROVED_VERSION_REQUIRED", "Persisted approved Version does not belong to the aggregate.");
  }
  const versionNumber = (id: string) => row.versions.find((version) => version.id === id)!.versionNumber;
  return PricingProject.rehydrate({
    id: row.id,
    companyId: row.companyId,
    clientId: row.clientId,
    ownerId: row.ownerId,
    estimateNumber: row.estimateNumber,
    status: row.status,
    revision: row.aggregateRevision,
    draftCurrency: row.draftCurrencyRevision,
    draft: {
      projectName: draft.projectName,
      pricingModel: draft.pricingModel,
      currency: draft.currency,
      pricingConfigurationVersionId: draft.pricingConfigurationVersionId,
      pricingConfigurationVersion: draft.pricingConfigurationVersion,
      configurationSchemaVersion: draft.configurationSchemaVersion,
      engineVersion: draft.engineVersion,
      methodologyVersion: draft.methodologyVersion,
      inputSnapshot: asJsonObject(draft.inputSnapshot),
      outputSnapshot: asJsonObject(draft.outputSnapshot),
      explanationSnapshot: asJsonObject(draft.explanationSnapshot),
      catalogSnapshot: asJsonObject(draft.catalogSnapshot)
    },
    versions: row.versions.map((version) => ({
      id: version.id,
      number: version.versionNumber,
      creatorId: version.creatorId,
      createdAt: version.createdAt.toISOString(),
      draftCurrency: version.draftCurrencyRevision,
      content: {
        projectName: version.projectName,
        pricingModel: version.pricingModel,
        currency: version.currency,
        pricingConfigurationVersionId: version.pricingConfigurationVersionId,
        pricingConfigurationVersion: version.pricingConfigurationVersion,
        configurationSchemaVersion: version.configurationSchemaVersion,
        engineVersion: version.engineVersion,
        methodologyVersion: version.methodologyVersion,
        inputSnapshot: asJsonObject(version.inputSnapshot),
        outputSnapshot: asJsonObject(version.outputSnapshot),
        explanationSnapshot: asJsonObject(version.explanationSnapshot),
        catalogSnapshot: asJsonObject(version.catalogSnapshot)
      }
    })),
    reviewCandidate: row.reviewCandidateVersionId ? {
      versionId: row.reviewCandidateVersionId,
      versionNumber: versionNumber(row.reviewCandidateVersionId),
      requestedBy: row.reviewRequestedBy!,
      requestedAt: row.reviewRequestedAt!.toISOString()
    } : null,
    approvedVersion: row.approvedVersionId ? {
      versionId: row.approvedVersionId,
      versionNumber: versionNumber(row.approvedVersionId),
      approvedBy: row.approvedBy!,
      approvedAt: row.approvedAt!.toISOString()
    } : null,
    reviewDecisions: row.reviewDecisions.map((decision) => ({
      outcome: decision.outcome,
      versionId: decision.pricingVersionId,
      versionNumber: decision.versionNumber,
      decidedBy: decision.decidedBy,
      decidedAt: decision.decidedAt.toISOString(),
      ...(decision.finding ? { finding: decision.finding } : {})
    })),
    processedCommands: row.processedCommands.map((command) => ({
      commandId: command.commandId,
      fingerprint: command.fingerprint,
      revision: command.aggregateRevision
    })),
    eventIds: row.governanceEvents.map(({ eventId }) => eventId)
  });
}

function contentData(content: PricingProject["draft"]) {
  return {
    projectName: content.projectName,
    pricingModel: content.pricingModel,
    currency: content.currency,
    pricingConfigurationVersionId: content.pricingConfigurationVersionId,
    pricingConfigurationVersion: content.pricingConfigurationVersion,
    configurationSchemaVersion: content.configurationSchemaVersion,
    engineVersion: content.engineVersion,
    methodologyVersion: content.methodologyVersion,
    inputSnapshot: content.inputSnapshot as Prisma.InputJsonValue,
    outputSnapshot: content.outputSnapshot as Prisma.InputJsonValue,
    explanationSnapshot: content.explanationSnapshot as Prisma.InputJsonValue,
    catalogSnapshot: content.catalogSnapshot as Prisma.InputJsonValue
  };
}

export interface PricingAggregateRepository {
  load(companyId: string, pricingProjectId: string): Promise<{ aggregate: PricingProject; revision: number } | null>;
  save(aggregate: PricingProject, expectedRevision: number, events: readonly PricingGovernanceEvent[]): Promise<{ revision: number }>;
}

export function createPrismaPricingAggregateRepository(client: PrismaClient = prisma): PricingAggregateRepository {
  return {
    async load(companyId, pricingProjectId) {
      const row = await client.pricingProject.findFirst({
        where: { id: pricingProjectId, companyId },
        include: governanceInclude
      });
      return row ? { aggregate: mapGovernanceAggregate(row), revision: row.aggregateRevision } : null;
    },

    async save(aggregate, expectedRevision, events) {
      const state = aggregate.persistenceState;
      return client.$transaction(async (transaction) => {
        const existing = await transaction.pricingProject.findFirst({
          where: { id: state.id, companyId: state.companyId },
          select: { aggregateRevision: true }
        });
        if (!existing) {
          if (expectedRevision !== 0) throw new PricingPersistenceConcurrencyError(expectedRevision, 0);
          await transaction.pricingProject.create({ data: {
            id: state.id,
            estimateNumber: state.estimateNumber,
            companyId: state.companyId,
            clientId: state.clientId,
            ownerId: state.ownerId,
            pricingConfigurationVersionId: state.draft.pricingConfigurationVersionId,
            projectName: state.draft.projectName,
            pricingModel: state.draft.pricingModel,
            methodologyVersion: state.draft.methodologyVersion,
            pricingInputSnapshot: state.draft.inputSnapshot as Prisma.InputJsonValue,
            pricingOutputSnapshot: state.draft.outputSnapshot as Prisma.InputJsonValue,
            status: state.status,
            currency: state.draft.currency,
            aggregateRevision: state.revision,
            draftCurrencyRevision: state.draftCurrency,
            reviewCandidateVersionId: state.reviewCandidate?.versionId ?? null,
            reviewRequestedBy: state.reviewCandidate?.requestedBy ?? null,
            reviewRequestedAt: state.reviewCandidate ? new Date(state.reviewCandidate.requestedAt) : null,
            approvedVersionId: state.approvedVersion?.versionId ?? null,
            approvedBy: state.approvedVersion?.approvedBy ?? null,
            approvedAt: state.approvedVersion ? new Date(state.approvedVersion.approvedAt) : null
          }});
        } else {
          const updated = await transaction.pricingProject.updateMany({
            where: { id: state.id, companyId: state.companyId, aggregateRevision: expectedRevision },
            data: {
              projectName: state.draft.projectName,
              pricingModel: state.draft.pricingModel,
              methodologyVersion: state.draft.methodologyVersion,
              pricingInputSnapshot: state.draft.inputSnapshot as Prisma.InputJsonValue,
              pricingOutputSnapshot: state.draft.outputSnapshot as Prisma.InputJsonValue,
              status: state.status,
              aggregateRevision: state.revision,
              draftCurrencyRevision: state.draftCurrency,
              reviewCandidateVersionId: state.reviewCandidate?.versionId ?? null,
              reviewRequestedBy: state.reviewCandidate?.requestedBy ?? null,
              reviewRequestedAt: state.reviewCandidate ? new Date(state.reviewCandidate.requestedAt) : null,
              approvedVersionId: state.approvedVersion?.versionId ?? null,
              approvedBy: state.approvedVersion?.approvedBy ?? null,
              approvedAt: state.approvedVersion ? new Date(state.approvedVersion.approvedAt) : null
            }
          });
          if (updated.count !== 1) throw new PricingPersistenceConcurrencyError(expectedRevision, existing.aggregateRevision);
        }

        await transaction.pricingDraft.upsert({
          where: { pricingProjectId: state.id },
          create: { pricingProjectId: state.id, companyId: state.companyId, ...contentData(state.draft), draftCurrencyRevision: state.draftCurrency },
          update: { ...contentData(state.draft), draftCurrencyRevision: state.draftCurrency }
        });
        await transaction.pricingVersion.createMany({ data: state.versions.map((version) => ({
          id: version.id,
          pricingProjectId: state.id,
          companyId: state.companyId,
          versionNumber: version.number,
          creatorId: version.creatorId,
          createdAt: new Date(version.createdAt),
          draftCurrencyRevision: version.draftCurrency,
          ...contentData(version.content)
        })), skipDuplicates: true });
        await transaction.pricingReviewDecision.createMany({ data: state.reviewDecisions.map((decision, index) => ({
          id: `${state.id}:review:${index + 1}`,
          pricingProjectId: state.id,
          companyId: state.companyId,
          pricingVersionId: decision.versionId,
          versionNumber: decision.versionNumber,
          outcome: decision.outcome,
          decidedBy: decision.decidedBy,
          decidedAt: new Date(decision.decidedAt),
          finding: decision.finding ?? null
        })), skipDuplicates: true });
        const newCommands = state.processedCommands.filter(
          ({ revision }) => revision > expectedRevision
        );
        if (newCommands.length) {
          await transaction.pricingProcessedCommand.createMany({ data: newCommands.map((command) => ({
            commandId: command.commandId,
            pricingProjectId: state.id,
            companyId: state.companyId,
            fingerprint: command.fingerprint,
            aggregateRevision: command.revision
          })) });
        }
        if (events.length) {
          await transaction.pricingGovernanceEventRecord.createMany({ data: events.map((event) => ({
            eventId: event.eventId,
            pricingProjectId: state.id,
            companyId: state.companyId,
            eventType: event.type,
            commandId: event.commandId,
            actorId: event.actorId,
            occurredAt: new Date(event.occurredAt),
            aggregateRevision: event.aggregateRevision,
            payload: event as unknown as Prisma.InputJsonValue
          })) });
        }
        const archive = [...events].reverse().find((event) => event.type === "PricingProjectArchived");
        if (archive) await transaction.pricingProject.update({
          where: { id: state.id },
          data: { archivedBy: archive.actorId, archivedAt: new Date(archive.occurredAt) }
        });
        return { revision: state.revision };
      }, { maxWait: 15_000, timeout: 15_000 });
    }
  };
}
