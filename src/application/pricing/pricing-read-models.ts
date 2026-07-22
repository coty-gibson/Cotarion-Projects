import type { PricingModelType } from "@/domain/pricing/types";
import type { PricingDraft, PricingProjectLifecycleStatus } from "@/domain/pricing/pricing-project";

export type PricingPermittedAction =
  | "EDIT_DRAFT"
  | "SAVE_VERSION"
  | "REQUEST_QUALITY_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "BEGIN_REVISION"
  | "ARCHIVE";

export interface PricingPartyReadModel {
  readonly id: string;
  readonly name: string;
}

export interface PricingProjectSummaryReadModel {
  readonly id: string;
  readonly estimateNumber: string;
  readonly client: PricingPartyReadModel & { readonly clientNumber: string };
  readonly owner: PricingPartyReadModel & { readonly email: string };
  readonly projectName: string;
  readonly status: PricingProjectLifecycleStatus;
  readonly pricingModel: PricingModelType;
  readonly currentVersion: null | { readonly id: string; readonly number: number };
  readonly lastUpdated: string;
}

export interface PricingVersionHistoryReadModel {
  readonly id: string;
  readonly number: number;
  readonly createdAt: string;
  readonly createdBy: PricingPartyReadModel;
  readonly approvalStatus: "SAVED" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  readonly reviewer: PricingPartyReadModel | null;
  readonly reviewedAt: string | null;
  readonly revisionOriginVersionId: string | null;
}

export interface PricingReviewHistoryReadModel {
  readonly type: "REQUESTED" | "APPROVED" | "REJECTED";
  readonly pricingVersionId: string;
  readonly versionNumber: number;
  readonly actor: PricingPartyReadModel;
  readonly findings: string | null;
  readonly occurredAt: string;
}

export interface PricingProjectDetailReadModel {
  readonly summary: PricingProjectSummaryReadModel;
  readonly draft: {
    readonly projectName: string;
    readonly pricingModel: PricingModelType;
    readonly currency: "USD";
    readonly pricingConfigurationVersionId: string;
    readonly pricingConfigurationVersion: number;
    readonly configurationSchemaVersion: number;
    readonly engineVersion: string;
    readonly methodologyVersion: string;
    readonly lastUpdated: string;
  };
  readonly approvedVersion: null | {
    readonly id: string;
    readonly number: number;
    readonly approvedBy: PricingPartyReadModel;
    readonly approvedAt: string;
  };
  readonly reviewCandidate: null | {
    readonly id: string;
    readonly number: number;
    readonly requestedBy: PricingPartyReadModel;
    readonly requestedAt: string;
  };
  readonly versionCount: number;
  readonly versions: readonly PricingVersionHistoryReadModel[];
  readonly reviews: readonly PricingReviewHistoryReadModel[];
  readonly permittedActions: readonly PricingPermittedAction[];
}

export type PricingProjectDetailSource = Omit<PricingProjectDetailReadModel, "permittedActions">;

export interface PricingEditableDraftReadModel {
  readonly pricingProjectId: string;
  readonly estimateNumber: string;
  readonly client: PricingPartyReadModel & { readonly clientNumber: string };
  readonly owner: PricingPartyReadModel & { readonly email: string };
  readonly draft: PricingDraft;
  readonly concurrencyToken: string;
  readonly permittedActions: readonly PricingPermittedAction[];
}

export interface PricingEditableDraftSource {
  readonly pricingProjectId: string;
  readonly estimateNumber: string;
  readonly client: PricingEditableDraftReadModel["client"];
  readonly owner: PricingEditableDraftReadModel["owner"];
  readonly draft: PricingDraft;
  readonly concurrencyVersion: number;
}

export interface PricingActionContextReadModel {
  readonly status: PricingProjectLifecycleStatus;
  readonly hasDraftCurrentVersion: boolean;
  readonly reviewCandidateCreatorId: string | null;
}

export type PricingSummarySortField = "lastUpdated" | "estimateNumber" | "projectName" | "status" | "pricingModel";
export type SortDirection = "asc" | "desc";

export interface PricingProjectListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: PricingProjectLifecycleStatus;
  readonly pricingModel?: PricingModelType;
  readonly sortBy: PricingSummarySortField;
  readonly sortDirection: SortDirection;
}

export interface PricingProjectListReadModel {
  readonly items: readonly PricingProjectSummaryReadModel[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PricingReadRepository {
  list(companyId: string, query: PricingProjectListQuery): Promise<PricingProjectListReadModel>;
  detail(companyId: string, pricingProjectId: string): Promise<PricingProjectDetailSource | null>;
  versions(companyId: string, pricingProjectId: string): Promise<readonly PricingVersionHistoryReadModel[] | null>;
  reviews(companyId: string, pricingProjectId: string): Promise<readonly PricingReviewHistoryReadModel[] | null>;
  editableDraft(companyId: string, pricingProjectId: string): Promise<PricingEditableDraftSource | null>;
  actionContext(companyId: string, pricingProjectId: string): Promise<PricingActionContextReadModel | null>;
}
