import type { ClientRecord, ClientRepository } from "@/application/clients/client";
import type {
  PersistedPricingConfigurationVersion,
  PersistedPricingProject,
  PricingConfigurationRepository,
  PricingProjectRepository,
  ServiceCatalogRepository
} from "@/application/pricing/pricing-persistence";
import {
  Decimal,
  INITIAL_RETAINER_LEVELS,
  INITIAL_RETAINER_TERMS,
  Money,
  PRICING_CONFIGURATION_SCHEMA_VERSION,
  ROUNDING_MODE,
  calculateAdvisoryPricing,
  calculateProjectPricing,
  calculateRetainerPricing,
  type AdvisoryPricingCalculation,
  type AdvisoryPricingInput,
  type AdjustedOperatingProfitMonthInput,
  type PricingConfiguration,
  type PricingModelType,
  type ProjectPricingCalculation,
  type ProjectPricingInput,
  type RetainerPricingCalculation,
  type RetainerPricingInput
} from "@/domain/pricing";

export const PRICING_PROJECT_STATUS_LABELS = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  QUOTED: "Quoted",
  ARCHIVED: "Archived"
} as const;

interface ConfigurationSnapshot {
  id: string;
  version: number;
  schemaVersion: number;
  currency: "USD";
  roundingMode: typeof ROUNDING_MODE;
  categories: { id: string; name: string; displayOrder: number }[];
  services: {
    id: string;
    categoryId: string;
    name: string;
    unitPrice: string;
    currency: "USD";
    active: boolean;
    displayOrder: number;
  }[];
  complexityFactors: {
    id: string;
    label: string;
    displayOrder: number;
    options: {
      id: string;
      label: string;
      increment: string;
      standard: boolean;
      displayOrder: number;
    }[];
  }[];
  discounts: { id: string; label: string; rate: string; displayOrder: number }[];
  retainerLevels?: {
    id: string;
    label: string;
    baseMonthlyFee: string;
    description: string;
    displayOrder: number;
  }[];
  retainerTerms?: {
    id: string;
    label: string;
    months: number;
    discountRate: string;
    displayOrder: number;
  }[];
  advisoryHourlyRate?: string;
  advisoryIncrementMinutes?: 30;
}

export interface PricingWorkspaceOptions {
  clients: { id: string; clientNumber: string; name: string }[];
  configurationVersionId: string;
  configuration: ConfigurationSnapshot;
  services: {
    catalogItemId: string;
    serviceId: string;
    categoryId: string;
    name: string;
    unitPrice: string;
  }[];
}

export interface PricingDraftInput {
  projectName: string;
  clientId: string;
  pricingModel: PricingModelType;
  lines: { lineId: string; serviceCatalogItemId: string; quantity: string }[];
  complexitySelections: { factorId: string; optionId: string }[];
  discountId: string;
  retainerLevelId: string;
  retainerTermId: string;
  fixedMonthlyPayment: string;
  aopMonths: AdjustedOperatingProfitMonthInput[];
  advisoryDurationMinutes: string;
}

export type PricingDraftCalculation =
  ProjectPricingCalculation | RetainerPricingCalculation | AdvisoryPricingCalculation;

export interface PricingDraftValidation {
  valid: boolean;
  messages: string[];
  calculation: PricingDraftCalculation | null;
  warnings: string[];
}

export interface PricingProjectListItem {
  id: string;
  estimateNumber: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  status: PersistedPricingProject["status"];
  pricingModel: PersistedPricingProject["pricingModel"];
  currency: "USD";
  updatedAt: Date;
}

export interface PricingProjectDetail {
  project: PersistedPricingProject;
  client: Pick<ClientRecord, "id" | "clientNumber" | "name">;
  calculation: PricingDraftCalculation;
}

function isConfigurationSnapshot(value: unknown): value is ConfigurationSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ConfigurationSnapshot>;
  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.version === "number" &&
    snapshot.currency === "USD" &&
    snapshot.roundingMode === ROUNDING_MODE &&
    Array.isArray(snapshot.categories) &&
    Array.isArray(snapshot.services) &&
    Array.isArray(snapshot.complexityFactors) &&
    Array.isArray(snapshot.discounts)
  );
}

export function hydratePricingConfiguration(
  version: PersistedPricingConfigurationVersion
): PricingConfiguration {
  if (!isConfigurationSnapshot(version.configuration)) {
    throw new Error("Stored Pricing Configuration is invalid.");
  }
  const snapshot = version.configuration;
  if (
    snapshot.id.trim() === "" ||
    snapshot.version !== version.version ||
    snapshot.schemaVersion !== PRICING_CONFIGURATION_SCHEMA_VERSION
  ) {
    throw new Error("Stored Pricing Configuration identity or schema does not match its version.");
  }

  return {
    id: snapshot.id,
    version: snapshot.version,
    schemaVersion: PRICING_CONFIGURATION_SCHEMA_VERSION,
    currency: snapshot.currency,
    roundingMode: snapshot.roundingMode,
    categories: snapshot.categories.map((category) => ({ ...category })),
    services: snapshot.services.map((service) => ({
      ...service,
      unitPrice: Money.usd(service.unitPrice)
    })),
    complexityFactors: snapshot.complexityFactors.map((factor) => ({
      ...factor,
      options: factor.options.map((option) => ({
        ...option,
        increment: Decimal.parse(option.increment)
      }))
    })),
    discounts: snapshot.discounts.map((discount) => ({
      ...discount,
      rate: Decimal.parse(discount.rate)
    })),
    retainerLevels:
      snapshot.retainerLevels?.map((level) => ({
        ...level,
        baseMonthlyFee: Money.usd(level.baseMonthlyFee)
      })) ?? INITIAL_RETAINER_LEVELS,
    retainerTerms:
      snapshot.retainerTerms?.map((term) => ({
        ...term,
        discountRate: Decimal.parse(term.discountRate)
      })) ?? INITIAL_RETAINER_TERMS,
    advisoryHourlyRate: Money.usd(snapshot.advisoryHourlyRate ?? "250.00"),
    advisoryIncrementMinutes: snapshot.advisoryIncrementMinutes ?? 30
  };
}

export function calculatePricingDraft(
  draft: PricingDraftInput,
  options: PricingWorkspaceOptions
): PricingDraftValidation {
  const messages: string[] = [];
  const projectName = draft.projectName.trim();
  if (!projectName) messages.push("Project name is required.");
  if (projectName.length > 200) messages.push("Project name must be 200 characters or fewer.");
  if (!options.clients.some(({ id }) => id === draft.clientId)) {
    messages.push("Select an available client.");
  }

  const servicesByCatalogId = new Map(
    options.services.map((service) => [service.catalogItemId, service])
  );
  const configuration = hydratePricingConfiguration({
    id: options.configurationVersionId,
    pricingConfigurationId: "",
    companyId: "",
    version: options.configuration.version,
    status: "ACTIVE",
    schemaVersion: options.configuration.schemaVersion,
    engineVersion: "",
    currency: "USD",
    configuration: options.configuration,
    effectiveFrom: new Date(0),
    createdAt: new Date(0)
  });
  const configurationReference = {
    pricingConfigurationId: configuration.id,
    pricingConfigurationVersion: configuration.version
  };
  const result =
    draft.pricingModel === "PROJECT"
      ? calculateProjectPricing(
          {
            ...configurationReference,
            serviceLines: draft.lines.map((line) => ({
              lineId: line.lineId,
              serviceId: servicesByCatalogId.get(line.serviceCatalogItemId)?.serviceId ?? "",
              quantity: line.quantity
            })),
            complexitySelections: draft.complexitySelections,
            discountId: draft.discountId
          } satisfies ProjectPricingInput,
          configuration
        )
      : draft.pricingModel === "ADVISORY_HOURLY"
        ? calculateAdvisoryPricing(
            {
              ...configurationReference,
              durationMinutes: draft.advisoryDurationMinutes
            } satisfies AdvisoryPricingInput,
            configuration
          )
        : calculateRetainerPricing(
            (draft.pricingModel === "FIXED_RETAINER"
              ? {
                  ...configurationReference,
                  pricingModel: draft.pricingModel,
                  retainerLevelId: draft.retainerLevelId,
                  retainerTermId: draft.retainerTermId,
                  discountId: draft.discountId,
                  complexitySelections: draft.complexitySelections
                }
              : draft.pricingModel === "HYBRID_RETAINER"
                ? {
                    ...configurationReference,
                    pricingModel: draft.pricingModel,
                    retainerLevelId: draft.retainerLevelId,
                    fixedMonthlyPayment: draft.fixedMonthlyPayment,
                    aopMonths: draft.aopMonths,
                    complexitySelections: draft.complexitySelections
                  }
                : {
                    ...configurationReference,
                    pricingModel: "PROFIT_SHARE_RETAINER",
                    retainerLevelId: draft.retainerLevelId,
                    aopMonths: draft.aopMonths,
                    complexitySelections: draft.complexitySelections
                  }) satisfies RetainerPricingInput,
            configuration
          );
  if (!result.valid) messages.push(...result.issues.map(({ message }) => message));

  return {
    valid: messages.length === 0 && result.valid,
    messages: [...new Set(messages)],
    calculation: result.valid ? result.calculation : null,
    warnings: result.warnings.map(({ message }) => message)
  };
}

export async function getPricingWorkspaceOptions(
  companyId: string,
  clientRepository: ClientRepository,
  catalogRepository: ServiceCatalogRepository,
  configurationRepository: PricingConfigurationRepository,
  pricingConfigurationVersionId?: string
): Promise<PricingWorkspaceOptions> {
  const [clients, catalogItems, version] = await Promise.all([
    clientRepository.listClients(companyId, {}),
    catalogRepository.listActiveServiceCatalogItems(companyId),
    pricingConfigurationVersionId
      ? configurationRepository.findPricingConfigurationVersion(
          companyId,
          pricingConfigurationVersionId
        )
      : configurationRepository.findActivePricingConfiguration(companyId)
  ]);
  if (!version) {
    throw new Error(
      pricingConfigurationVersionId
        ? "The Pricing Project configuration version is unavailable."
        : "No active Pricing Configuration is available."
    );
  }
  const configuration = hydratePricingConfiguration(version);
  const snapshot = version.configuration as ConfigurationSnapshot;
  const configuredServices = new Map(
    configuration.services.map((service) => [service.id, service])
  );

  return {
    clients: clients.map(({ id, clientNumber, name }) => ({ id, clientNumber, name })),
    configurationVersionId: version.id,
    configuration: snapshot,
    services: catalogItems
      .map((item) => {
        const service = configuredServices.get(item.code);
        return service
          ? {
              catalogItemId: item.id,
              serviceId: service.id,
              categoryId: service.categoryId,
              name: service.name,
              unitPrice: service.unitPrice.toString()
            }
          : null;
      })
      .filter((service): service is NonNullable<typeof service> => Boolean(service))
  };
}

function persistenceDraft(draft: PricingDraftInput) {
  return {
    projectName: draft.projectName.trim(),
    pricingModel: draft.pricingModel,
    methodologyVersion:
      draft.pricingModel === "PROJECT"
        ? "project-pricing/1.0.0"
        : draft.pricingModel === "ADVISORY_HOURLY"
          ? "advisory-hourly/1.0.0"
          : "retainer-pricing/1.0.0",
    pricingInputSnapshot: {
      pricingModel: draft.pricingModel,
      retainerLevelId: draft.retainerLevelId,
      retainerTermId: draft.retainerTermId,
      fixedMonthlyPayment: draft.fixedMonthlyPayment,
      aopMonths: draft.aopMonths.map((month) => ({ ...month })),
      advisoryDurationMinutes: draft.advisoryDurationMinutes
    },
    lines: (draft.pricingModel === "PROJECT" ? draft.lines : []).map((line, index) => ({
      serviceCatalogItemId: line.serviceCatalogItemId,
      quantity: line.quantity,
      sortOrder: index + 1
    })),
    complexitySelections: (draft.pricingModel === "ADVISORY_HOURLY"
      ? []
      : draft.complexitySelections
    ).map((selection, index) => ({
      factorCode: selection.factorId,
      optionCode: selection.optionId,
      sortOrder: index + 1
    })),
    discountSelection: {
      discountCode:
        draft.pricingModel === "PROJECT" || draft.pricingModel === "FIXED_RETAINER"
          ? draft.discountId
          : "none",
      sortOrder: 1
    }
  };
}

function outputSnapshot(calculation: PricingDraftCalculation) {
  if ("finalProjectPrice" in calculation) {
    return {
      pricingModel: "PROJECT",
      methodologyVersion: "project-pricing/1.0.0",
      projectSubtotal: calculation.projectSubtotal.toString(),
      complexityMultiplier: calculation.complexityMultiplier.toString(),
      adjustedSubtotal: calculation.adjustedSubtotal.toString(),
      discountRate: calculation.discountRate.toString(),
      discountAmount: calculation.discountAmount.toString(),
      finalAmount: calculation.finalProjectPrice.toString(),
      currency: calculation.currency
    };
  }
  if ("finalAdvisoryFee" in calculation) {
    return {
      pricingModel: calculation.pricingModel,
      methodologyVersion: calculation.methodologyVersion,
      durationMinutes: calculation.durationMinutes,
      billingIncrements: calculation.billingIncrements,
      hourlyRate: calculation.hourlyRate.toString(),
      finalAmount: calculation.finalAdvisoryFee.toString(),
      currency: calculation.currency
    };
  }
  return {
    pricingModel: calculation.pricingModel,
    methodologyVersion: calculation.methodologyVersion,
    retainerLevelId: calculation.retainerLevelId,
    baseMonthlyFee: calculation.baseMonthlyFee.toString(),
    complexityMultiplier: calculation.complexityMultiplier.toString(),
    complexityAdjustedMonthlyBase: calculation.complexityAdjustedMonthlyBase.toString(),
    termDiscountRate: calculation.termDiscountRate.toString(),
    standardDiscountRate: calculation.standardDiscountRate.toString(),
    totalDiscountRate: calculation.totalDiscountRate.toString(),
    discountAmount: calculation.discountAmount.toString(),
    fixedMonthlyPayment: calculation.fixedMonthlyPayment.toString(),
    averageAdjustedOperatingProfit: calculation.averageAdjustedOperatingProfit?.toString() ?? null,
    profitShareTarget: calculation.profitShareTarget.toString(),
    profitShareRate: calculation.profitShareRate.toString(),
    estimatedProfitSharePayment: calculation.estimatedProfitSharePayment.toString(),
    finalAmount: calculation.estimatedMonthlyValue.toString(),
    equivalentPricingModel: calculation.equivalentPricingModel,
    currency: calculation.currency
  };
}

export async function createPricingProjectDraft(
  companyId: string,
  ownerId: string,
  draft: PricingDraftInput,
  options: PricingWorkspaceOptions,
  repository: PricingProjectRepository
) {
  const validation = calculatePricingDraft(draft, options);
  if (!validation.valid) return { project: null, validation };
  const project = await repository.createPricingProject(companyId, {
    ...persistenceDraft(draft),
    pricingOutputSnapshot: outputSnapshot(validation.calculation!),
    clientId: draft.clientId,
    ownerId,
    pricingConfigurationVersionId: options.configurationVersionId
  });
  return { project, validation };
}

export async function updatePricingProjectDraft(
  companyId: string,
  pricingProjectId: string,
  draft: PricingDraftInput,
  options: PricingWorkspaceOptions,
  repository: PricingProjectRepository
) {
  const existing = await repository.findPricingProject(companyId, pricingProjectId);
  if (!existing) {
    return {
      project: null,
      validation: {
        valid: false,
        messages: ["Pricing Project not found."],
        calculation: null,
        warnings: []
      }
    };
  }
  if (existing.status !== "DRAFT") {
    return {
      project: null,
      validation: {
        valid: false,
        messages: ["Only Draft Pricing Projects can be edited."],
        calculation: null,
        warnings: []
      }
    };
  }
  if (draft.clientId !== existing.clientId) {
    return {
      project: null,
      validation: {
        valid: false,
        messages: ["The Client on an existing Pricing Project cannot be changed."],
        calculation: null,
        warnings: []
      }
    };
  }
  if (options.configurationVersionId !== existing.pricingConfigurationVersionId) {
    return {
      project: null,
      validation: {
        valid: false,
        messages: ["The original Pricing Configuration version must be used when editing."],
        calculation: null,
        warnings: []
      }
    };
  }
  const validation = calculatePricingDraft(draft, options);
  if (!validation.valid) return { project: null, validation };
  const project = await repository.replacePricingProjectDraft(companyId, pricingProjectId, {
    ...persistenceDraft(draft),
    pricingOutputSnapshot: outputSnapshot(validation.calculation!)
  });
  return { project, validation };
}

export async function getPricingProjectDetail(
  companyId: string,
  pricingProjectId: string,
  clientRepository: ClientRepository,
  catalogRepository: ServiceCatalogRepository,
  configurationRepository: PricingConfigurationRepository,
  projectRepository: PricingProjectRepository
): Promise<PricingProjectDetail | null> {
  const project = await projectRepository.findPricingProject(companyId, pricingProjectId);
  if (!project) return null;
  const [client, version, catalogItems] = await Promise.all([
    clientRepository.findClient(companyId, project.clientId),
    configurationRepository.findPricingConfigurationVersion(
      companyId,
      project.pricingConfigurationVersionId
    ),
    catalogRepository.listActiveServiceCatalogItems(companyId)
  ]);
  if (!client || !version) return null;
  const configuration = hydratePricingConfiguration(version);
  const itemCodes = new Map(catalogItems.map((item) => [item.id, item.code]));
  const savedInput =
    project.pricingInputSnapshot &&
    typeof project.pricingInputSnapshot === "object" &&
    "pricingModel" in project.pricingInputSnapshot
      ? (project.pricingInputSnapshot as Partial<PricingDraftInput>)
      : null;
  const draft: PricingDraftInput = {
    projectName: project.projectName,
    clientId: project.clientId,
    pricingModel: project.pricingModel,
    lines: project.lines.map((line) => ({
      lineId: line.id,
      serviceCatalogItemId: line.serviceCatalogItemId,
      quantity: line.quantity
    })),
    complexitySelections: project.complexitySelections.map((selection) => ({
      factorId: selection.factorCode,
      optionId: selection.optionCode
    })),
    discountId: project.discountSelection?.discountCode ?? "none",
    retainerLevelId: savedInput?.retainerLevelId ?? "advisory",
    retainerTermId: savedInput?.retainerTermId ?? "3-month",
    fixedMonthlyPayment: savedInput?.fixedMonthlyPayment ?? "0.00",
    aopMonths: savedInput?.aopMonths ?? [],
    advisoryDurationMinutes: savedInput?.advisoryDurationMinutes ?? "30"
  };
  const result = calculatePricingDraft(draft, {
    clients: [{ id: client.id, clientNumber: client.clientNumber, name: client.name }],
    configurationVersionId: version.id,
    configuration: version.configuration as ConfigurationSnapshot,
    services: catalogItems.map((item) => ({
      catalogItemId: item.id,
      serviceId: itemCodes.get(item.id) ?? item.code,
      categoryId: configuration.services.find(({ id }) => id === item.code)?.categoryId ?? "",
      name: item.name,
      unitPrice: Money.fromMinorUnits(item.basePriceMinor).toString()
    }))
  });
  if (!result.valid || !result.calculation) {
    throw new Error("Persisted Pricing Project is not calculable.");
  }
  return {
    project,
    client: { id: client.id, clientNumber: client.clientNumber, name: client.name },
    calculation: result.calculation
  };
}

export async function listCompanyPricingProjects(
  companyId: string,
  clientRepository: ClientRepository,
  projectRepository: PricingProjectRepository
): Promise<PricingProjectListItem[]> {
  const clients = await clientRepository.listClients(companyId, {});
  const projectsByClient = await Promise.all(
    clients.map(async (client) => ({
      client,
      projects: await projectRepository.listPricingProjectsForClient(companyId, client.id)
    }))
  );
  return projectsByClient
    .flatMap(({ client, projects }) =>
      projects.map((project) => ({
        id: project.id,
        estimateNumber: project.estimateNumber,
        projectName: project.projectName,
        clientId: client.id,
        clientName: client.name,
        clientNumber: client.clientNumber,
        status: project.status,
        pricingModel: project.pricingModel,
        currency: project.currency,
        updatedAt: project.updatedAt
      }))
    )
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}
