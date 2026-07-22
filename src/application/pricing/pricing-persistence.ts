/**
 * @deprecated Phase 4 normalized persistence contracts.
 *
 * Quarantined for historical migration compatibility only. No production
 * Pricing application or presentation path may depend on these contracts.
 * Governed commands use PricingAggregateRepository; queries use
 * PricingReadRepository.
 */
export type PersistedPricingProjectStatus = "DRAFT" | "IN_REVIEW" | "QUOTED" | "ARCHIVED";
export type PersistedPricingModelType =
  "PROJECT" | "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | "HYBRID_RETAINER" | "ADVISORY_HOURLY";

export interface PersistedServiceCatalogItem {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description: string | null;
  basePriceMinor: bigint;
  currency: "USD";
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}

export interface PersistedPricingConfigurationVersion {
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
}

export interface PersistedPricingProjectLine {
  id: string;
  serviceCatalogItemId: string;
  serviceCode: string;
  serviceName: string;
  basePriceMinor: bigint;
  quantity: string;
  sortOrder: number;
}

export interface PersistedComplexitySelection {
  id: string;
  factorCode: string;
  optionCode: string;
  sortOrder: number;
}

export interface PersistedDiscountSelection {
  id: string;
  discountCode: string;
  sortOrder: number;
}

export interface PersistedPricingProject {
  id: string;
  estimateNumber: string;
  companyId: string;
  clientId: string;
  ownerId: string;
  sourcePricingProjectId: string | null;
  pricingConfigurationVersionId: string;
  projectName: string;
  pricingModel: PersistedPricingModelType;
  methodologyVersion: string;
  pricingInputSnapshot: unknown;
  pricingOutputSnapshot: unknown;
  status: PersistedPricingProjectStatus;
  currency: "USD";
  createdAt: Date;
  updatedAt: Date;
  lines: readonly PersistedPricingProjectLine[];
  complexitySelections: readonly PersistedComplexitySelection[];
  discountSelection: PersistedDiscountSelection | null;
}

export interface PricingProjectDraftData {
  projectName: string;
  pricingModel?: PersistedPricingModelType;
  methodologyVersion?: string;
  pricingInputSnapshot?: unknown;
  pricingOutputSnapshot?: unknown;
  lines: readonly {
    serviceCatalogItemId: string;
    quantity: string;
    sortOrder: number;
  }[];
  complexitySelections: readonly {
    factorCode: string;
    optionCode: string;
    sortOrder: number;
  }[];
  discountSelection: {
    discountCode: string;
    sortOrder: number;
  };
}

export interface CreatePricingProjectPersistenceInput extends PricingProjectDraftData {
  clientId: string;
  ownerId: string;
  pricingConfigurationVersionId: string;
  sourcePricingProjectId?: string | null;
}

export interface PricingProjectRepository {
  createPricingProject(
    companyId: string,
    input: CreatePricingProjectPersistenceInput
  ): Promise<PersistedPricingProject>;
  findPricingProject(
    companyId: string,
    pricingProjectId: string
  ): Promise<PersistedPricingProject | null>;
  listPricingProjectsForClient(
    companyId: string,
    clientId: string
  ): Promise<readonly PersistedPricingProject[]>;
  replacePricingProjectDraft(
    companyId: string,
    pricingProjectId: string,
    input: PricingProjectDraftData
  ): Promise<PersistedPricingProject | null>;
}

export interface ServiceCatalogRepository {
  listActiveServiceCatalogItems(companyId: string): Promise<readonly PersistedServiceCatalogItem[]>;
  findServiceCatalogItem(
    companyId: string,
    serviceCatalogItemId: string
  ): Promise<PersistedServiceCatalogItem | null>;
}

export interface PricingConfigurationRepository {
  findActivePricingConfiguration(
    companyId: string
  ): Promise<PersistedPricingConfigurationVersion | null>;
  findPricingConfigurationVersion(
    companyId: string,
    pricingConfigurationVersionId: string
  ): Promise<PersistedPricingConfigurationVersion | null>;
}
