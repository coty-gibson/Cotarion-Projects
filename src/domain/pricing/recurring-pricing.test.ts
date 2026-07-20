import { describe, expect, it } from "vitest";
import {
  INITIAL_PRICING_CONFIGURATION,
  calculateAdvisoryPricing,
  calculateRetainerPricing,
  type ComplexitySelectionInput
} from "@/domain/pricing";

function selections(overrides: Record<string, string> = {}): readonly ComplexitySelectionInput[] {
  return INITIAL_PRICING_CONFIGURATION.complexityFactors.map((factor) => ({
    factorId: factor.id,
    optionId:
      overrides[factor.id] ??
      factor.options.find(({ standard }) => standard)?.id ??
      factor.options[0].id
  }));
}

const aopMonths = [
  { month: "2026-04", adjustedOperatingProfit: "10000.00", adjustmentNotes: "Reviewed" },
  { month: "2026-05", adjustedOperatingProfit: "10000.00", adjustmentNotes: "Reviewed" },
  { month: "2026-06", adjustedOperatingProfit: "10000.00", adjustmentNotes: "Reviewed" }
];

const complexity = selections({
  "business-size": "business-size-41-plus",
  "multi-location": "multi-location-2-3",
  "multi-department": "multi-department-3-4",
  "condition-severity": "condition-noticeable",
  "industry-severity": "industry-moderate",
  "urgency-timeline": "urgency-critical"
});

describe("Version 1 Retainer pricing", () => {
  it("uses the approved four-factor half-weight complexity formula", () => {
    const result = calculateRetainerPricing(
      {
        pricingModel: "FIXED_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        retainerTermId: "3-month",
        discountId: "none",
        complexitySelections: complexity
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.calculation.complexityMultiplier.toString()).toBe("1.225");
    expect(result.calculation.complexityAdjustedMonthlyBase.toString()).toBe("1225.00");
  });

  it("applies term and standard discounts only to Fixed retainers", () => {
    const result = calculateRetainerPricing(
      {
        pricingModel: "FIXED_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        retainerTermId: "6-month",
        discountId: "nonprofit",
        complexitySelections: complexity
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.calculation.totalDiscountRate.toString()).toBe("0.15");
    expect(result.calculation.discountAmount.toString()).toBe("183.75");
    expect(result.calculation.fixedMonthlyPayment.toString()).toBe("1041.25");
  });

  it("rounds full Profit-Share to the nearest half percentage point", () => {
    const result = calculateRetainerPricing(
      {
        pricingModel: "PROFIT_SHARE_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        complexitySelections: complexity,
        aopMonths
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.calculation.profitShareTarget.toString()).toBe("1531.25");
    expect(result.calculation.profitShareRate.toString()).toBe("0.155");
    expect(result.calculation.estimatedProfitSharePayment.toString()).toBe("1550.00");
  });

  it("calculates Hybrid against only the uncovered adjusted base", () => {
    const result = calculateRetainerPricing(
      {
        pricingModel: "HYBRID_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        complexitySelections: complexity,
        fixedMonthlyPayment: "500.00",
        aopMonths
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.calculation.profitShareTarget.toString()).toBe("906.25");
    expect(result.calculation.profitShareRate.toString()).toBe("0.09");
    expect(result.calculation.estimatedMonthlyValue.toString()).toBe("1400.00");
  });

  it("identifies allowed Hybrid boundary values and rejects values above the base", () => {
    const zero = calculateRetainerPricing(
      {
        pricingModel: "HYBRID_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        complexitySelections: selections(),
        fixedMonthlyPayment: "0.00",
        aopMonths
      },
      INITIAL_PRICING_CONFIGURATION
    );
    const full = calculateRetainerPricing(
      {
        pricingModel: "HYBRID_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        complexitySelections: selections(),
        fixedMonthlyPayment: "1000.00",
        aopMonths: []
      },
      INITIAL_PRICING_CONFIGURATION
    );
    const excessive = calculateRetainerPricing(
      {
        pricingModel: "HYBRID_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        complexitySelections: selections(),
        fixedMonthlyPayment: "1000.01",
        aopMonths
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(zero.valid && zero.calculation.equivalentPricingModel).toBe("PROFIT_SHARE_RETAINER");
    expect(full.valid && full.calculation.equivalentPricingModel).toBe("FIXED_RETAINER");
    expect(excessive.valid).toBe(false);
  });

  it("requires three consecutive months and a positive AOP average", () => {
    const result = calculateRetainerPricing(
      {
        pricingModel: "PROFIT_SHARE_RETAINER",
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        retainerLevelId: "advisory",
        complexitySelections: selections(),
        aopMonths: [
          { month: "2026-04", adjustedOperatingProfit: "-100.00", adjustmentNotes: "Loss" },
          { month: "2026-05", adjustedOperatingProfit: "0.00", adjustmentNotes: "Break-even" },
          { month: "2026-06", adjustedOperatingProfit: "100.00", adjustmentNotes: "Profit" }
        ]
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("AOP_AVERAGE_NOT_POSITIVE");
  });
});

describe("Version 1 Advisory Consulting pricing", () => {
  it("prices $250 per hour in 30-minute increments", () => {
    const result = calculateAdvisoryPricing(
      {
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        durationMinutes: "90"
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.calculation.billingIncrements).toBe(3);
    expect(result.calculation.incrementPrice.toString()).toBe("125.00");
    expect(result.calculation.finalAdvisoryFee.toString()).toBe("375.00");
  });

  it.each(["0", "15", "45", "60.5"])("rejects invalid duration %s", (durationMinutes) => {
    const result = calculateAdvisoryPricing(
      {
        pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
        durationMinutes
      },
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(false);
  });
});
