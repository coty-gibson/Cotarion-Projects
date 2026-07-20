import { describe, expect, it } from "vitest";
import {
  Decimal,
  INITIAL_PRICING_CONFIGURATION,
  INITIAL_PROJECT_SERVICES,
  Money,
  calculateProjectPricing,
  type PricingConfiguration,
  type ProjectPricingInput,
  validatePricingConfiguration
} from "@/domain/pricing";

function standardSelections(configuration = INITIAL_PRICING_CONFIGURATION) {
  return configuration.complexityFactors.map((factor) => ({
    factorId: factor.id,
    optionId: factor.options.find(({ standard }) => standard)!.id
  }));
}

function input(overrides: Partial<ProjectPricingInput> = {}): ProjectPricingInput {
  return {
    pricingConfigurationId: INITIAL_PRICING_CONFIGURATION.id,
    pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version,
    serviceLines: [
      {
        lineId: "line-1",
        serviceId: "svc-business-strategy-session",
        quantity: "1"
      }
    ],
    complexitySelections: standardSelections(),
    discountId: "none",
    ...overrides
  };
}

function calculate(validInput: ProjectPricingInput = input()) {
  const result = calculateProjectPricing(validInput, INITIAL_PRICING_CONFIGURATION);
  expect(result.valid).toBe(true);
  if (!result.valid) throw new Error("Expected valid pricing result.");
  return result.calculation;
}

describe("initial pricing configuration", () => {
  it("is a valid USD project-pricing configuration", () => {
    expect(validatePricingConfiguration(INITIAL_PRICING_CONFIGURATION)).toEqual([]);
    expect(INITIAL_PRICING_CONFIGURATION.currency).toBe("USD");
    expect(INITIAL_PRICING_CONFIGURATION.roundingMode).toBe("HALF_AWAY_FROM_ZERO");
  });

  it("contains all 29 active workbook services with preserved names and prices", () => {
    expect(
      INITIAL_PROJECT_SERVICES.map(({ name, unitPrice }) => [name, unitPrice.toString()])
    ).toEqual([
      ["Business Strategy Session", "250.00"],
      ["Client Experience Diagnostic", "350.00"],
      ["Operational Efficiency Diagnostic", "350.00"],
      ["Business Launch & Foundation Package", "3000.00"],
      ["Operations Optimization Package", "6500.00"],
      ["Leadership & Team Excellence Package", "4500.00"],
      ["Client Experience & Growth Package", "5000.00"],
      ["Associate Client Experience Training Basic (2 hours)", "400.00"],
      ["Associate Client Experience Extended Half-Day", "900.00"],
      ["Associate Client Experience Extended Full-Day", "1500.00"],
      ["Sales Skill Development Training Basic (2 hours)", "450.00"],
      ["Sales Skill Development Extended Half-Day", "1000.00"],
      ["Sales Skill Development Extended Full-Day", "1800.00"],
      ["Manager & Leadership Training Basic (2 hours)", "500.00"],
      ["Manager & Leadership Extended Half-Day", "1200.00"],
      ["Manager & Leadership Extended Full-Day", "2000.00"],
      ["Team Coaching Basic (60 minutes)", "250.00"],
      ["Team Coaching Extended Half-Day", "600.00"],
      ["Team Coaching Extended Full-Day", "1000.00"],
      ["Team Coaching – 3 Session Bundle (60 minutes each)", "600.00"],
      ["Team Coaching – 5 Session Bundle (60 minutes each)", "1000.00"],
      ["Process Coaching Session (60 minutes)", "300.00"],
      ["Advanced Process Coaching Session (90 minutes)", "450.00"],
      ["Simple SOP", "75.00"],
      ["Complex SOP", "150.00"],
      ["Simple Workflow", "300.00"],
      ["Complex Workflow", "500.00"],
      ["1-Week Extension", "300.00"],
      ["1-Month Support", "900.00"]
    ]);
    expect(INITIAL_PROJECT_SERVICES.every(({ active }) => active)).toBe(true);
    expect(new Set(INITIAL_PROJECT_SERVICES.map(({ id }) => id)).size).toBe(29);
  });

  it("defines one explicit Standard option for every approved complexity factor", () => {
    expect(INITIAL_PRICING_CONFIGURATION.complexityFactors).toHaveLength(6);
    for (const factor of INITIAL_PRICING_CONFIGURATION.complexityFactors) {
      const standards = factor.options.filter(({ standard }) => standard);
      expect(standards).toHaveLength(1);
      expect(standards[0].label).toBe("Standard");
      expect(standards[0].increment.toString()).toBe("0");
    }
  });

  it("defines the four approved, non-stacking discount selections", () => {
    expect(
      INITIAL_PRICING_CONFIGURATION.discounts.map(({ label, rate }) => [label, rate.toString()])
    ).toEqual([
      ["None", "0"],
      ["Pro Bono / Volunteer", "1"],
      ["Nonprofit", "0.1"],
      ["Veteran-Owned", "0.1"]
    ]);
  });
});

describe("project-pricing workbook parity", () => {
  it("calculates every approved catalog service at its preserved quantity-one price", () => {
    for (const service of INITIAL_PROJECT_SERVICES) {
      const result = calculate(
        input({
          serviceLines: [{ lineId: `line-${service.id}`, serviceId: service.id, quantity: "1" }]
        })
      );
      expect(result.serviceLines[0].lineTotal.equals(service.unitPrice)).toBe(true);
      expect(result.finalProjectPrice.equals(service.unitPrice)).toBe(true);
    }
  });

  it("prices one service at Standard complexity with no discount", () => {
    const result = calculate();
    expect(result.projectSubtotal.toString()).toBe("250.00");
    expect(result.complexityMultiplier.toString()).toBe("1");
    expect(result.complexityAdjustment.toString()).toBe("0.00");
    expect(result.finalProjectPrice.toString()).toBe("250.00");
  });

  it("multiplies service quantity", () => {
    const result = calculate(
      input({
        serviceLines: [
          {
            lineId: "line-1",
            serviceId: "svc-operations-optimization-package",
            quantity: "2"
          }
        ]
      })
    );
    expect(result.finalProjectPrice.toString()).toBe("13000.00");
  });

  it("combines complexity increments additively", () => {
    const selections = standardSelections().map((selection) => {
      const replacements: Record<string, string> = {
        "business-size": "business-size-6-15",
        "multi-location": "multi-location-2-3",
        "condition-severity": "condition-severe"
      };
      return {
        ...selection,
        optionId: replacements[selection.factorId] ?? selection.optionId
      };
    });

    const result = calculate(input({ complexitySelections: selections }));
    expect(result.complexityMultiplier.toString()).toBe("1.45");
    expect(result.complexityAdjustment.toString()).toBe("112.50");
    expect(result.adjustedSubtotal.toString()).toBe("362.50");
    expect(result.finalProjectPrice.toString()).toBe("362.50");
  });

  it("applies the Nonprofit discount after complexity", () => {
    const selections = standardSelections().map((selection) =>
      selection.factorId === "business-size"
        ? { ...selection, optionId: "business-size-6-15" }
        : selection
    );
    const result = calculate(
      input({
        serviceLines: [
          {
            lineId: "line-1",
            serviceId: "svc-operations-optimization-package",
            quantity: "1"
          }
        ],
        complexitySelections: selections,
        discountId: "nonprofit"
      })
    );

    expect(result.adjustedSubtotal.toString()).toBe("7150.00");
    expect(result.discountAmount.toString()).toBe("715.00");
    expect(result.finalProjectPrice.toString()).toBe("6435.00");
  });

  it("allows the configured Pro Bono / Volunteer discount to produce zero", () => {
    const result = calculate(input({ discountId: "pro-bono-volunteer" }));
    expect(result.discountAmount.toString()).toBe("250.00");
    expect(result.finalProjectPrice.toString()).toBe("0.00");
  });

  it("includes every dynamic service line and permits duplicate services", () => {
    const serviceLines = Array.from({ length: 30 }, (_, index) => ({
      lineId: `line-${index + 1}`,
      serviceId: "svc-business-strategy-session",
      quantity: "1"
    }));
    const result = calculate(input({ serviceLines }));

    expect(result.serviceLines).toHaveLength(30);
    expect(result.projectSubtotal.toString()).toBe("7500.00");
    expect(result.finalProjectPrice.toString()).toBe("7500.00");
  });

  it("uses all maximum complexity options for a 2.95 multiplier", () => {
    const selections = INITIAL_PRICING_CONFIGURATION.complexityFactors.map((factor) => ({
      factorId: factor.id,
      optionId: factor.options.at(-1)!.id
    }));
    const result = calculate(input({ complexitySelections: selections }));

    expect(result.complexityMultiplier.toString()).toBe("2.95");
    expect(result.adjustedSubtotal.toString()).toBe("737.50");
  });
});

describe("fixed-decimal rounding", () => {
  it("rounds after the line, complexity, discount, and final monetary steps", () => {
    const configuration: PricingConfiguration = {
      ...INITIAL_PRICING_CONFIGURATION,
      id: "rounding-fixture",
      services: [
        {
          id: "one-cent-service",
          categoryId: "diagnostics",
          name: "One Cent Service",
          unitPrice: Money.usd("0.01"),
          currency: "USD",
          active: true,
          displayOrder: 1
        }
      ],
      complexityFactors: [
        {
          id: "rounding-factor",
          label: "Rounding Factor",
          displayOrder: 1,
          options: [
            {
              id: "rounding-standard",
              label: "Standard",
              increment: Decimal.zero(),
              standard: true,
              displayOrder: 1
            },
            {
              id: "rounding-half",
              label: "Half",
              increment: Decimal.parse("0.50"),
              standard: false,
              displayOrder: 2
            }
          ]
        }
      ],
      discounts: [
        {
          id: "quarter",
          label: "Quarter",
          rate: Decimal.parse("0.25"),
          displayOrder: 1
        }
      ]
    };
    const result = calculateProjectPricing(
      {
        pricingConfigurationId: configuration.id,
        pricingConfigurationVersion: configuration.version,
        serviceLines: [{ lineId: "line-1", serviceId: "one-cent-service", quantity: "0.50" }],
        complexitySelections: [{ factorId: "rounding-factor", optionId: "rounding-half" }],
        discountId: "quarter"
      },
      configuration
    );

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.calculation.serviceLines[0].lineTotal.toString()).toBe("0.01");
    expect(result.calculation.adjustedSubtotal.toString()).toBe("0.02");
    expect(result.calculation.discountAmount.toString()).toBe("0.01");
    expect(result.calculation.finalProjectPrice.toString()).toBe("0.01");
  });

  it("preserves percentage precision independently from money precision", () => {
    const precise = Decimal.parse("0.123456789");
    expect(precise.toString()).toBe("0.123456789");
    expect(Money.usd("100.00").multiplyAndRound(precise).toString()).toBe("12.35");
  });
});

describe("pricing validation", () => {
  it.each(["0", "-1", "1.001", "1.", ".5", "NaN"])("rejects invalid quantity %s", (quantity) => {
    const result = calculateProjectPricing(
      input({
        serviceLines: [{ lineId: "line-1", serviceId: "svc-business-strategy-session", quantity }]
      }),
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some(({ code }) => code.startsWith("QUANTITY_"))).toBe(true);
  });

  it.each(["0.01", "1", "1.5", "1.50", "999999999999.99"])(
    "accepts positive quantity %s with at most two decimals",
    (quantity) => {
      const result = calculateProjectPricing(
        input({
          serviceLines: [{ lineId: "line-1", serviceId: "svc-business-strategy-session", quantity }]
        }),
        INITIAL_PRICING_CONFIGURATION
      );
      expect(result.valid).toBe(true);
    }
  );

  it("rejects unknown and inactive services by immutable identifier", () => {
    const unknown = calculateProjectPricing(
      input({
        serviceLines: [{ lineId: "line-1", serviceId: "Business Strategy Session", quantity: "1" }]
      }),
      INITIAL_PRICING_CONFIGURATION
    );
    const inactiveConfiguration: PricingConfiguration = {
      ...INITIAL_PRICING_CONFIGURATION,
      services: INITIAL_PRICING_CONFIGURATION.services.map((service, index) =>
        index === 0 ? { ...service, active: false } : service
      )
    };
    const inactive = calculateProjectPricing(input(), inactiveConfiguration);

    expect(unknown.valid).toBe(false);
    expect(unknown.issues.some(({ code }) => code === "SERVICE_UNKNOWN")).toBe(true);
    expect(inactive.valid).toBe(false);
    expect(inactive.issues.some(({ code }) => code === "SERVICE_INACTIVE")).toBe(true);
  });

  it("requires exactly one factor-specific option per complexity factor", () => {
    const selections = standardSelections();
    const missing = calculateProjectPricing(
      input({ complexitySelections: selections.slice(1) }),
      INITIAL_PRICING_CONFIGURATION
    );
    const duplicate = calculateProjectPricing(
      input({ complexitySelections: [...selections, selections[0]] }),
      INITIAL_PRICING_CONFIGURATION
    );
    const mismatch = calculateProjectPricing(
      input({
        complexitySelections: selections.map((selection, index) =>
          index === 0 ? { ...selection, optionId: "multi-location-standard" } : selection
        )
      }),
      INITIAL_PRICING_CONFIGURATION
    );

    expect(missing.issues.some(({ code }) => code === "COMPLEXITY_SELECTION_COUNT_INVALID")).toBe(
      true
    );
    expect(duplicate.issues.some(({ code }) => code === "COMPLEXITY_SELECTION_COUNT_INVALID")).toBe(
      true
    );
    expect(mismatch.issues.some(({ code }) => code === "COMPLEXITY_OPTION_MISMATCH")).toBe(true);
  });

  it("rejects unknown discounts and configuration-version mismatches", () => {
    const result = calculateProjectPricing(
      input({
        pricingConfigurationVersion: INITIAL_PRICING_CONFIGURATION.version + 1,
        discountId: "manual-override"
      }),
      INITIAL_PRICING_CONFIGURATION
    );
    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["CONFIGURATION_VERSION_MISMATCH", "DISCOUNT_UNKNOWN"])
    );
  });

  it("rejects malformed relational configuration", () => {
    const configuration: PricingConfiguration = {
      ...INITIAL_PRICING_CONFIGURATION,
      services: [
        {
          ...INITIAL_PRICING_CONFIGURATION.services[0],
          categoryId: "not-a-category"
        }
      ]
    };
    expect(validatePricingConfiguration(configuration).map(({ code }) => code)).toContain(
      "SERVICE_CATEGORY_UNKNOWN"
    );
  });
});

describe("domain invariants and explainability", () => {
  it("is deterministic and does not mutate frozen inputs", () => {
    const frozenInput = Object.freeze({
      ...input(),
      serviceLines: Object.freeze(input().serviceLines.map((line) => Object.freeze({ ...line }))),
      complexitySelections: Object.freeze(
        input().complexitySelections.map((selection) => Object.freeze({ ...selection }))
      )
    });

    const first = calculateProjectPricing(frozenInput, INITIAL_PRICING_CONFIGURATION);
    const second = calculateProjectPricing(frozenInput, INITIAL_PRICING_CONFIGURATION);

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.calculation.finalProjectPrice.toString()).toBe(
      second.calculation.finalProjectPrice.toString()
    );
    expect(first.calculation.engineVersion).toBe("pricing-engine/2.0.0");
  });

  it("returns an ordered, business-readable calculation breakdown", () => {
    const result = calculate();
    expect(result.steps.map(({ kind }) => kind)).toEqual([
      "SERVICE_LINE",
      "PROJECT_SUBTOTAL",
      "COMPLEXITY_ADJUSTMENT",
      "ADJUSTED_SUBTOTAL",
      "DISCOUNT",
      "FINAL_PROJECT_PRICE"
    ]);
    expect(result.steps.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("never reduces the pre-discount subtotal when positive service lines are added", () => {
    let priorSubtotal = Money.zero();
    for (let count = 1; count <= 20; count += 1) {
      const result = calculate(
        input({
          serviceLines: Array.from({ length: count }, (_, index) => ({
            lineId: `line-${index}`,
            serviceId: "svc-simple-sop",
            quantity: "0.01"
          }))
        })
      );
      expect(result.projectSubtotal.toMinorUnits() >= priorSubtotal.toMinorUnits()).toBe(true);
      priorSubtotal = result.projectSubtotal;
    }
  });

  it("never returns a negative final project price for any configured discount", () => {
    for (const discount of INITIAL_PRICING_CONFIGURATION.discounts) {
      const result = calculate(input({ discountId: discount.id }));
      expect(result.finalProjectPrice.toMinorUnits() >= BigInt(0)).toBe(true);
    }
  });
});
