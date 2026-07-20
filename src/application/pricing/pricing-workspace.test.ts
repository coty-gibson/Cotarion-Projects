import { describe, expect, it } from "vitest";
import type { PricingWorkspaceOptions } from "@/application/pricing/pricing-workspace";
import {
  calculatePricingDraft,
  hydratePricingConfiguration
} from "@/application/pricing/pricing-workspace";
import { INITIAL_PRICING_CONFIGURATION, PRICING_ENGINE_VERSION } from "@/domain/pricing";

function configurationSnapshot() {
  return {
    ...INITIAL_PRICING_CONFIGURATION,
    categories: INITIAL_PRICING_CONFIGURATION.categories.map((category) => ({ ...category })),
    services: INITIAL_PRICING_CONFIGURATION.services.map((service) => ({
      ...service,
      unitPrice: service.unitPrice.toString()
    })),
    complexityFactors: INITIAL_PRICING_CONFIGURATION.complexityFactors.map((factor) => ({
      ...factor,
      options: factor.options.map((option) => ({
        ...option,
        increment: option.increment.toString()
      }))
    })),
    discounts: INITIAL_PRICING_CONFIGURATION.discounts.map((discount) => ({
      ...discount,
      rate: discount.rate.toString()
    })),
    retainerLevels: INITIAL_PRICING_CONFIGURATION.retainerLevels.map((level) => ({
      ...level,
      baseMonthlyFee: level.baseMonthlyFee.toString()
    })),
    retainerTerms: INITIAL_PRICING_CONFIGURATION.retainerTerms.map((term) => ({
      ...term,
      discountRate: term.discountRate.toString()
    })),
    advisoryHourlyRate: INITIAL_PRICING_CONFIGURATION.advisoryHourlyRate.toString()
  };
}

function options(): PricingWorkspaceOptions {
  return {
    clients: [{ id: "client-1", clientNumber: "CLI-000001", name: "Acme" }],
    configurationVersionId: "configuration-version-1",
    configuration: configurationSnapshot() as PricingWorkspaceOptions["configuration"],
    services: INITIAL_PRICING_CONFIGURATION.services.map((service) => ({
      catalogItemId: `catalog-${service.id}`,
      serviceId: service.id,
      categoryId: service.categoryId,
      name: service.name,
      unitPrice: service.unitPrice.toString()
    }))
  };
}

function standardSelections() {
  return INITIAL_PRICING_CONFIGURATION.complexityFactors.map((factor) => ({
    factorId: factor.id,
    optionId: factor.options.find(({ standard }) => standard)!.id
  }));
}

function projectModelFields() {
  return {
    pricingModel: "PROJECT" as const,
    retainerLevelId: "advisory",
    retainerTermId: "3-month",
    fixedMonthlyPayment: "0.00",
    aopMonths: [],
    advisoryDurationMinutes: "30"
  };
}

describe("Pricing workspace application coordination", () => {
  it("hydrates the persisted configuration without changing Phase 2 rules", () => {
    const workspace = options();
    const configuration = hydratePricingConfiguration({
      id: workspace.configurationVersionId,
      pricingConfigurationId: "configuration-1",
      companyId: "company-1",
      version: workspace.configuration.version,
      status: "ACTIVE",
      schemaVersion: 1,
      engineVersion: PRICING_ENGINE_VERSION,
      currency: "USD",
      configuration: workspace.configuration,
      effectiveFrom: new Date(),
      createdAt: new Date()
    });

    expect(configuration.services).toHaveLength(29);
    expect(configuration.complexityFactors).toHaveLength(6);
    expect(configuration.discounts).toHaveLength(4);
    expect(configuration.services[0].unitPrice.toString()).toBe("250.00");
  });

  it("uses the authoritative domain for live workspace calculations", () => {
    const workspace = options();
    const evaluation = calculatePricingDraft(
      {
        ...projectModelFields(),
        projectName: "Operations optimization",
        clientId: "client-1",
        lines: [
          {
            lineId: "line-1",
            serviceCatalogItemId: "catalog-svc-business-strategy-session",
            quantity: "2.00"
          }
        ],
        complexitySelections: standardSelections().map((selection) =>
          selection.factorId === "business-size"
            ? { ...selection, optionId: "business-size-6-15" }
            : selection
        ),
        discountId: "nonprofit"
      },
      workspace
    );

    expect(evaluation.valid).toBe(true);
    expect(evaluation.calculation && "finalProjectPrice" in evaluation.calculation).toBe(true);
    if (!evaluation.calculation || !("finalProjectPrice" in evaluation.calculation)) return;
    expect(evaluation.calculation.projectSubtotal.toString()).toBe("500.00");
    expect(evaluation.calculation.complexityMultiplier.toString()).toBe("1.1");
    expect(evaluation.calculation.discountAmount.toString()).toBe("55.00");
    expect(evaluation.calculation.finalProjectPrice.toString()).toBe("495.00");
  });

  it("blocks missing Clients, invalid quantities, and incomplete names before persistence", () => {
    const evaluation = calculatePricingDraft(
      {
        ...projectModelFields(),
        projectName: " ",
        clientId: "another-client",
        lines: [
          {
            lineId: "line-1",
            serviceCatalogItemId: "catalog-svc-business-strategy-session",
            quantity: "0"
          }
        ],
        complexitySelections: standardSelections(),
        discountId: "none"
      },
      options()
    );

    expect(evaluation.valid).toBe(false);
    expect(evaluation.messages).toEqual(
      expect.arrayContaining([
        "Project name is required.",
        "Select an available client.",
        "Quantity must be greater than zero."
      ])
    );
  });
});
