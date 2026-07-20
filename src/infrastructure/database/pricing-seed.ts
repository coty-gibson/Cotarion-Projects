import type { Prisma, PrismaClient } from "@prisma/client";
import {
  INITIAL_PRICING_CONFIGURATION,
  INITIAL_PROJECT_SERVICES,
  PRICING_ENGINE_VERSION
} from "@/domain/pricing";
import { prisma } from "@/infrastructure/database/prisma";

export const INITIAL_PRICING_CONFIGURATION_EFFECTIVE_FROM = new Date("2026-07-20T00:00:00.000Z");

function configurationSnapshot(): Prisma.InputJsonObject {
  return {
    id: INITIAL_PRICING_CONFIGURATION.id,
    version: INITIAL_PRICING_CONFIGURATION.version,
    schemaVersion: INITIAL_PRICING_CONFIGURATION.schemaVersion,
    currency: INITIAL_PRICING_CONFIGURATION.currency,
    roundingMode: INITIAL_PRICING_CONFIGURATION.roundingMode,
    categories: INITIAL_PRICING_CONFIGURATION.categories.map((category) => ({ ...category })),
    services: INITIAL_PRICING_CONFIGURATION.services.map((service) => ({
      id: service.id,
      categoryId: service.categoryId,
      name: service.name,
      unitPrice: service.unitPrice.toString(),
      currency: service.currency,
      active: service.active,
      displayOrder: service.displayOrder
    })),
    complexityFactors: INITIAL_PRICING_CONFIGURATION.complexityFactors.map((factor) => ({
      id: factor.id,
      label: factor.label,
      displayOrder: factor.displayOrder,
      options: factor.options.map((option) => ({
        id: option.id,
        label: option.label,
        increment: option.increment.toString(),
        standard: option.standard,
        displayOrder: option.displayOrder
      }))
    })),
    discounts: INITIAL_PRICING_CONFIGURATION.discounts.map((discount) => ({
      id: discount.id,
      label: discount.label,
      rate: discount.rate.toString(),
      displayOrder: discount.displayOrder
    })),
    retainerLevels: INITIAL_PRICING_CONFIGURATION.retainerLevels.map((level) => ({
      id: level.id,
      label: level.label,
      baseMonthlyFee: level.baseMonthlyFee.toString(),
      description: level.description,
      displayOrder: level.displayOrder
    })),
    retainerTerms: INITIAL_PRICING_CONFIGURATION.retainerTerms.map((term) => ({
      id: term.id,
      label: term.label,
      months: term.months,
      discountRate: term.discountRate.toString(),
      displayOrder: term.displayOrder
    })),
    advisoryHourlyRate: INITIAL_PRICING_CONFIGURATION.advisoryHourlyRate.toString(),
    advisoryIncrementMinutes: INITIAL_PRICING_CONFIGURATION.advisoryIncrementMinutes
  };
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalJson(entry)])
    );
  }
  return value;
}

function stableJson(value: unknown) {
  return JSON.stringify(canonicalJson(value));
}

export interface PricingFoundationSeedResult {
  serviceCount: number;
  pricingConfigurationId: string;
  pricingConfigurationVersionId: string;
  pricingConfigurationVersion: number;
}

export async function seedPricingFoundation(
  companyId: string,
  client: PrismaClient = prisma
): Promise<PricingFoundationSeedResult> {
  return client.$transaction(async (transaction) => {
    const company = await transaction.company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });
    if (!company) throw new Error(`Cannot seed pricing for unknown Company ${companyId}.`);

    for (const service of INITIAL_PROJECT_SERVICES) {
      const existing = await transaction.serviceCatalogItem.findUnique({
        where: { companyId_code: { companyId, code: service.id } }
      });

      if (!existing) {
        await transaction.serviceCatalogItem.create({
          data: {
            companyId,
            code: service.id,
            name: service.name,
            description: null,
            basePriceMinor: service.unitPrice.toMinorUnits(),
            currency: service.currency,
            status: "ACTIVE",
            sortOrder: service.displayOrder
          }
        });
        continue;
      }

      const matchesBaseline =
        existing.name === service.name &&
        existing.basePriceMinor === service.unitPrice.toMinorUnits() &&
        existing.currency === service.currency &&
        existing.status === "ACTIVE" &&
        existing.sortOrder === service.displayOrder;
      if (!matchesBaseline) {
        throw new Error(
          `Existing Service Catalog item ${service.id} differs from the approved baseline.`
        );
      }
    }

    const configuration = await transaction.pricingConfiguration.upsert({
      where: { companyId },
      create: { companyId },
      update: {}
    });
    const snapshot = configurationSnapshot();
    const existingVersion = await transaction.pricingConfigurationVersion.findUnique({
      where: {
        pricingConfigurationId_version: {
          pricingConfigurationId: configuration.id,
          version: INITIAL_PRICING_CONFIGURATION.version
        }
      }
    });

    let versionId: string;
    if (existingVersion) {
      const matchesBaseline =
        existingVersion.companyId === companyId &&
        existingVersion.status === "ACTIVE" &&
        existingVersion.schemaVersion === INITIAL_PRICING_CONFIGURATION.schemaVersion &&
        existingVersion.engineVersion === PRICING_ENGINE_VERSION &&
        existingVersion.currency === INITIAL_PRICING_CONFIGURATION.currency &&
        existingVersion.effectiveFrom.getTime() ===
          INITIAL_PRICING_CONFIGURATION_EFFECTIVE_FROM.getTime() &&
        stableJson(existingVersion.configuration) === stableJson(snapshot);
      if (!matchesBaseline) {
        throw new Error(
          "Existing Pricing Configuration version differs from the approved baseline."
        );
      }
      versionId = existingVersion.id;
    } else {
      const activeVersion = await transaction.pricingConfigurationVersion.findFirst({
        where: { companyId, status: "ACTIVE" },
        select: { id: true, version: true }
      });
      if (activeVersion) {
        if (activeVersion.version >= INITIAL_PRICING_CONFIGURATION.version) {
          throw new Error("Company already has a different active Pricing Configuration version.");
        }
        await transaction.pricingConfigurationVersion.update({
          where: { id: activeVersion.id },
          data: { status: "RETIRED" }
        });
      }
      const createdVersion = await transaction.pricingConfigurationVersion.create({
        data: {
          pricingConfigurationId: configuration.id,
          companyId,
          version: INITIAL_PRICING_CONFIGURATION.version,
          status: "ACTIVE",
          schemaVersion: INITIAL_PRICING_CONFIGURATION.schemaVersion,
          engineVersion: PRICING_ENGINE_VERSION,
          currency: INITIAL_PRICING_CONFIGURATION.currency,
          configuration: snapshot,
          effectiveFrom: INITIAL_PRICING_CONFIGURATION_EFFECTIVE_FROM
        }
      });
      versionId = createdVersion.id;
    }

    return {
      serviceCount: INITIAL_PROJECT_SERVICES.length,
      pricingConfigurationId: configuration.id,
      pricingConfigurationVersionId: versionId,
      pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version
    };
  });
}

export { configurationSnapshot as createInitialPricingConfigurationSnapshot };
