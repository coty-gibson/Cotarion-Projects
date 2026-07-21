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

const pricingProjectInclude = {
  lines: {
    include: { serviceCatalogItem: true },
    orderBy: { sortOrder: "asc" as const }
  },
  complexitySelections: { orderBy: { sortOrder: "asc" as const } },
  discountSelection: true
} satisfies Prisma.PricingProjectInclude;

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

    async updatePricingProjectStatus(companyId, pricingProjectId, status) {
      const updated = await client.pricingProject.updateMany({
        where: { id: pricingProjectId, companyId },
        data: { status }
      });
      if (updated.count === 0) return null;
      return mapProject((await findProject(client, companyId, pricingProjectId))!);
    }
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
