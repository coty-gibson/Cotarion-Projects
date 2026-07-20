import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_TYPE_POLICY_VERSION,
  MAJOR_RECORD_NUMBER_POLICIES,
  PRICING_SNAPSHOT_SCHEMA_VERSION,
  type ProposalPricingSnapshot,
  isValidMajorRecordNumber
} from "@/domain/proposals/contracts";
import {
  CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1,
  engagementTypePolicy,
  isDirectEngagementPermitted
} from "@/domain/proposals/engagement-type-policies";

const baseSnapshot = {
  schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
  pricingProjectId: "pricing-project-1",
  pricingProjectNumber: "EST-000001",
  companyId: "company-1",
  clientId: "client-1",
  operatingGroupCode: "CONSULTING",
  sourceStatus: "QUOTED",
  pricingConfigurationVersionId: "configuration-version-2",
  pricingConfigurationVersion: 2,
  engineVersion: "pricing-engine/2.0.0",
  inputSnapshot: { pricingModel: "PROJECT" },
  approvedAt: "2026-07-20T12:00:00.000Z",
  approvedByUserId: "user-1",
  capturedAt: "2026-07-20T12:01:00.000Z"
} as const;

const snapshots: readonly ProposalPricingSnapshot[] = [
  {
    ...baseSnapshot,
    pricingModel: "PROJECT",
    methodologyVersion: "project-pricing/1.0.0",
    outputSnapshot: {
      pricingModel: "PROJECT",
      methodologyVersion: "project-pricing/1.0.0",
      projectSubtotal: "1000.00",
      complexityMultiplier: "1.1",
      adjustedSubtotal: "1100.00",
      discountRate: "0.1",
      discountAmount: "110.00",
      finalAmount: "990.00",
      currency: "USD"
    }
  },
  ...(["FIXED_RETAINER", "PROFIT_SHARE_RETAINER", "HYBRID_RETAINER"] as const).map(
    (pricingModel): ProposalPricingSnapshot => ({
      ...baseSnapshot,
      pricingModel,
      methodologyVersion: "retainer-pricing/1.0.0",
      inputSnapshot: { pricingModel },
      outputSnapshot: {
        pricingModel,
        methodologyVersion: "retainer-pricing/1.0.0",
        retainerLevelId: "strategic",
        baseMonthlyFee: "2000.00",
        complexityMultiplier: "1.1",
        complexityAdjustedMonthlyBase: "2200.00",
        termDiscountRate: "0",
        standardDiscountRate: "0",
        totalDiscountRate: "0",
        discountAmount: "0.00",
        fixedMonthlyPayment: pricingModel === "PROFIT_SHARE_RETAINER" ? "0.00" : "1000.00",
        averageAdjustedOperatingProfit: pricingModel === "FIXED_RETAINER" ? null : "10000.00",
        profitShareTarget: pricingModel === "FIXED_RETAINER" ? "0.00" : "1500.00",
        profitShareRate: pricingModel === "FIXED_RETAINER" ? "0" : "0.15",
        estimatedProfitSharePayment: pricingModel === "FIXED_RETAINER" ? "0.00" : "1500.00",
        finalAmount: "2200.00",
        equivalentPricingModel: null,
        currency: "USD"
      }
    })
  ),
  {
    ...baseSnapshot,
    pricingModel: "ADVISORY_HOURLY",
    methodologyVersion: "advisory-hourly/1.0.0",
    inputSnapshot: { pricingModel: "ADVISORY_HOURLY", durationMinutes: "90" },
    outputSnapshot: {
      pricingModel: "ADVISORY_HOURLY",
      methodologyVersion: "advisory-hourly/1.0.0",
      durationMinutes: 90,
      billingIncrements: 3,
      hourlyRate: "250.00",
      finalAmount: "375.00",
      currency: "USD"
    }
  }
];

describe("Proposal Management Sprint 0 contracts", () => {
  it("serializes a frozen snapshot contract for every Consulting Pricing Model", () => {
    expect(snapshots.map(({ pricingModel }) => pricingModel)).toEqual([
      "PROJECT",
      "FIXED_RETAINER",
      "PROFIT_SHARE_RETAINER",
      "HYBRID_RETAINER",
      "ADVISORY_HOURLY"
    ]);
    for (const snapshot of snapshots) {
      const roundTrip = JSON.parse(JSON.stringify(snapshot)) as ProposalPricingSnapshot;
      expect(roundTrip).toEqual(snapshot);
      expect(roundTrip.outputSnapshot.pricingModel).toBe(snapshot.pricingModel);
      expect(roundTrip.outputSnapshot.methodologyVersion).toBe(snapshot.methodologyVersion);
      expect(roundTrip.pricingConfigurationVersionId).toBe("configuration-version-2");
    }
  });

  it("encodes the complete versioned Consulting Engagement Type matrix", () => {
    expect(CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1).toHaveLength(5);
    expect(
      CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1.every(
        ({ policyVersion }) => policyVersion === ENGAGEMENT_TYPE_POLICY_VERSION
      )
    ).toBe(true);
    expect(engagementTypePolicy("STRATEGY_SESSION").allowedPricingModels).toEqual(["PROJECT"]);
    expect(engagementTypePolicy("ADVISORY").allowedPricingModels).toEqual(["ADVISORY_HOURLY"]);
    expect(engagementTypePolicy("DIAGNOSTIC").allowedPricingModels).toEqual(["PROJECT"]);
    expect(engagementTypePolicy("PROJECT").allowedPricingModels).toEqual([
      "PROJECT",
      "PROFIT_SHARE_RETAINER",
      "HYBRID_RETAINER"
    ]);
    expect(engagementTypePolicy("RETAINER").allowedPricingModels).toEqual([
      "FIXED_RETAINER",
      "PROFIT_SHARE_RETAINER",
      "HYBRID_RETAINER"
    ]);
  });

  it("derives direct Engagement eligibility exclusively from versioned policy", () => {
    expect(isDirectEngagementPermitted("STRATEGY_SESSION")).toBe(true);
    expect(isDirectEngagementPermitted("ADVISORY")).toBe(true);
    expect(isDirectEngagementPermitted("DIAGNOSTIC")).toBe(true);
    expect(isDirectEngagementPermitted("PROJECT")).toBe(false);
    expect(isDirectEngagementPermitted("RETAINER")).toBe(false);
  });

  it("freezes valid initial states and transition graphs for every Engagement Type", () => {
    for (const policy of CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1) {
      const statusCodes = new Set(policy.workflow.map(({ code }) => code));
      expect(statusCodes.has(policy.initialStatus)).toBe(true);
      expect(policy.transitions.length).toBeGreaterThan(0);
      for (const transition of policy.transitions) {
        expect(statusCodes.has(transition.from)).toBe(true);
        expect(statusCodes.has(transition.to)).toBe(true);
      }
      for (const terminal of policy.workflow.filter(({ terminal }) => terminal)) {
        expect(policy.transitions.some(({ from }) => from === terminal.code)).toBe(false);
      }
    }
    expect(engagementTypePolicy("RETAINER").transitions).toContainEqual({
      from: "RENEWED",
      to: "ACTIVE"
    });
  });

  it("accepts permanent current prefixes and the issued Pricing Project legacy prefix", () => {
    expect(Object.keys(MAJOR_RECORD_NUMBER_POLICIES)).toHaveLength(8);
    expect(isValidMajorRecordNumber("PRICING_PROJECT", "PP-000001")).toBe(true);
    expect(isValidMajorRecordNumber("PRICING_PROJECT", "EST-000001")).toBe(true);
    expect(isValidMajorRecordNumber("PROPOSAL", "PRO-000001")).toBe(true);
    expect(isValidMajorRecordNumber("CLIENT", "CLI-000001")).toBe(true);
    expect(isValidMajorRecordNumber("PROPOSAL", "EST-000001")).toBe(false);
    expect(isValidMajorRecordNumber("PRICING_PROJECT", "PP-1")).toBe(false);
  });
});
