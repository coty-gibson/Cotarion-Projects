/**
 * Frozen Sprint 0 contracts for the Proposal Management boundary.
 *
 * These types intentionally contain no Proposal lifecycle behavior and import no
 * Pricing calculation implementation. Sprint 1 owns Proposal domain behavior.
 */

export const PROPOSAL_CONTRACT_VERSION = 1 as const;
export const PRICING_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const PROPOSAL_CONTENT_SCHEMA_VERSION = 1 as const;
export const PLATFORM_EVENT_SCHEMA_VERSION = 1 as const;
export const ENGAGEMENT_TYPE_POLICY_VERSION = 1 as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type ConsultingPricingModel =
  "PROJECT" | "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | "HYBRID_RETAINER" | "ADVISORY_HOURLY";

interface PricingOutputBase {
  readonly pricingModel: ConsultingPricingModel;
  readonly methodologyVersion: string;
  readonly finalAmount: string;
  readonly currency: "USD";
}

export interface ProjectPricingOutputSnapshot extends PricingOutputBase {
  readonly pricingModel: "PROJECT";
  readonly projectSubtotal: string;
  readonly complexityMultiplier: string;
  readonly adjustedSubtotal: string;
  readonly discountRate: string;
  readonly discountAmount: string;
}

export interface RetainerPricingOutputSnapshot extends PricingOutputBase {
  readonly pricingModel: "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | "HYBRID_RETAINER";
  readonly retainerLevelId: string;
  readonly baseMonthlyFee: string;
  readonly complexityMultiplier: string;
  readonly complexityAdjustedMonthlyBase: string;
  readonly termDiscountRate: string;
  readonly standardDiscountRate: string;
  readonly totalDiscountRate: string;
  readonly discountAmount: string;
  readonly fixedMonthlyPayment: string;
  readonly averageAdjustedOperatingProfit: string | null;
  readonly profitShareTarget: string;
  readonly profitShareRate: string;
  readonly estimatedProfitSharePayment: string;
  readonly equivalentPricingModel: "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | null;
}

export interface AdvisoryPricingOutputSnapshot extends PricingOutputBase {
  readonly pricingModel: "ADVISORY_HOURLY";
  readonly durationMinutes: number;
  readonly billingIncrements: number;
  readonly hourlyRate: string;
}

export type ProposalPricingOutputSnapshot =
  ProjectPricingOutputSnapshot | RetainerPricingOutputSnapshot | AdvisoryPricingOutputSnapshot;

export interface ProposalPricingSnapshotV1 {
  readonly schemaVersion: typeof PRICING_SNAPSHOT_SCHEMA_VERSION;
  readonly pricingProjectId: string;
  readonly pricingProjectNumber: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly operatingGroupCode: "CONSULTING";
  readonly sourceStatus: "QUOTED";
  readonly pricingConfigurationVersionId: string;
  readonly pricingConfigurationVersion: number;
  readonly engineVersion: string;
  readonly pricingModel: ConsultingPricingModel;
  readonly methodologyVersion: string;
  readonly inputSnapshot: JsonObject;
  readonly outputSnapshot: ProposalPricingOutputSnapshot;
  readonly approvedAt: string;
  readonly approvedByUserId: string;
  readonly capturedAt: string;
}

export type ProposalPricingSnapshot = ProposalPricingSnapshotV1;

export interface ProposalContentSectionV1 {
  readonly sectionId: string;
  readonly sectionType:
    | "EXECUTIVE_SUMMARY"
    | "CLIENT_NEEDS"
    | "RECOMMENDATIONS"
    | "SERVICES"
    | "DELIVERABLES"
    | "COMMERCIAL_TERMS"
    | "ASSUMPTIONS"
    | "NEXT_STEPS"
    | "CUSTOM";
  readonly heading: string;
  readonly body: string;
  readonly displayOrder: number;
  readonly clientVisible: boolean;
}

export interface ProposalStructuredContentV1 {
  readonly schemaVersion: typeof PROPOSAL_CONTENT_SCHEMA_VERSION;
  readonly title: string;
  readonly sections: readonly ProposalContentSectionV1[];
}

export const PROPOSAL_STATUSES = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "SUBMITTED",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "SUPERSEDED",
  "ARCHIVED"
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_EVENT_TYPES = [
  "PROPOSAL_CREATED",
  "PROPOSAL_VERSION_SAVED",
  "PROPOSAL_INTERNAL_REVIEW_REQUESTED",
  "PROPOSAL_CHANGES_REQUESTED",
  "PROPOSAL_SUBMITTED",
  "PROPOSAL_VIEWED",
  "PROPOSAL_ACCEPTED",
  "PROPOSAL_VERBAL_ACCEPTANCE_RECORDED",
  "PROPOSAL_ACCEPTANCE_WITHDRAWN",
  "PROPOSAL_DECLINED",
  "PROPOSAL_EXPIRED",
  "PROPOSAL_SUPERSEDED",
  "PROPOSAL_ARCHIVED"
] as const;

export type ProposalEventType = (typeof PROPOSAL_EVENT_TYPES)[number];

export interface PlatformBusinessEventV1 {
  readonly eventSchemaVersion: typeof PLATFORM_EVENT_SCHEMA_VERSION;
  readonly eventId: string;
  readonly occurredAt: string;
  readonly publishedAt: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly eventType: string;
  readonly sourceAggregateType: string;
  readonly sourceRecordId: string;
  readonly sourceReferenceNumber: string | null;
  readonly displaySummary: string;
  readonly responsibleUserId: string | null;
  readonly operatingGroupId: string | null;
  readonly engagementId: string | null;
  readonly actorType: "USER" | "CLIENT" | "SYSTEM" | "EXTERNAL";
  readonly correlationId: string | null;
  readonly causationId: string | null;
  readonly metadata: JsonObject;
}

export interface ProposalBusinessEventV1 extends PlatformBusinessEventV1 {
  readonly eventType: ProposalEventType;
  readonly sourceAggregateType: "PROPOSAL";
}

export const MAJOR_RECORD_NUMBER_POLICIES = {
  PRICING_PROJECT: { currentPrefix: "PP", historicalPrefixes: ["EST"] },
  PROPOSAL: { currentPrefix: "PRO", historicalPrefixes: [] },
  SERVICE_AGREEMENT: { currentPrefix: "AGR", historicalPrefixes: [] },
  ENGAGEMENT: { currentPrefix: "ENG", historicalPrefixes: [] },
  INVOICE: { currentPrefix: "INV", historicalPrefixes: [] },
  PAYMENT: { currentPrefix: "PAY", historicalPrefixes: [] },
  CLIENT: { currentPrefix: "CLI", historicalPrefixes: [] },
  COMPANY: { currentPrefix: "COM", historicalPrefixes: [] }
} as const;

export type MajorRecordType = keyof typeof MAJOR_RECORD_NUMBER_POLICIES;

export function isValidMajorRecordNumber(recordType: MajorRecordType, value: string) {
  const policy = MAJOR_RECORD_NUMBER_POLICIES[recordType];
  const prefixes: readonly string[] = [policy.currentPrefix, ...policy.historicalPrefixes];
  return prefixes.some((prefix) => new RegExp(`^${prefix}-\\d{6,}$`).test(value));
}
