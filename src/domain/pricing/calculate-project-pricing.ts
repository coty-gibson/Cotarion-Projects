import { Decimal } from "@/domain/pricing/decimal";
import { Money } from "@/domain/pricing/money";
import {
  PRICING_ENGINE_VERSION,
  type PricingCalculationStep,
  type PricingConfiguration,
  type ProjectPricingInput,
  type ProjectPricingResult
} from "@/domain/pricing/types";
import { validateProjectPricingInput } from "@/domain/pricing/validation";

export function calculateProjectPricing(
  input: ProjectPricingInput,
  configuration: PricingConfiguration
): ProjectPricingResult {
  const issues = validateProjectPricingInput(input, configuration);
  const warnings = issues.filter(({ severity }) => severity === "WARNING");
  const errors = issues.filter(({ severity }) => severity === "ERROR");

  if (errors.length > 0) {
    return { valid: false, calculation: null, issues: errors, warnings };
  }

  const services = new Map(configuration.services.map((service) => [service.id, service]));
  const pricedLines = input.serviceLines.map((line) => {
    const service = services.get(line.serviceId)!;
    const quantity = Decimal.parse(line.quantity);
    return {
      lineId: line.lineId,
      serviceId: service.id,
      serviceName: service.name,
      categoryId: service.categoryId,
      quantity: quantity.toString(),
      unitPrice: service.unitPrice,
      lineTotal: service.unitPrice.multiplyAndRound(quantity)
    };
  });

  const projectSubtotal = pricedLines.reduce(
    (subtotal, line) => subtotal.add(line.lineTotal),
    Money.zero()
  );

  const selectedOptions = input.complexitySelections.map((selection) => {
    const factor = configuration.complexityFactors.find(({ id }) => id === selection.factorId)!;
    return factor.options.find(({ id }) => id === selection.optionId)!;
  });
  const complexityMultiplier = selectedOptions.reduce(
    (multiplier, option) => multiplier.add(option.increment),
    Decimal.one()
  );
  const adjustedSubtotal = projectSubtotal.multiplyAndRound(complexityMultiplier);
  const complexityAdjustment = adjustedSubtotal.subtract(projectSubtotal);

  const discount = configuration.discounts.find(({ id }) => id === input.discountId)!;
  const discountAmount = adjustedSubtotal.multiplyAndRound(discount.rate);
  const finalProjectPrice = adjustedSubtotal.subtract(discountAmount);

  const steps: PricingCalculationStep[] = pricedLines.map((line, index) => ({
    kind: "SERVICE_LINE",
    order: index + 1,
    label: `${line.serviceName} × ${line.quantity}`,
    amount: line.lineTotal,
    lineId: line.lineId
  }));
  steps.push(
    {
      kind: "PROJECT_SUBTOTAL",
      order: steps.length + 1,
      label: "Project subtotal",
      amount: projectSubtotal
    },
    {
      kind: "COMPLEXITY_ADJUSTMENT",
      order: steps.length + 2,
      label: `Complexity adjustment (${complexityMultiplier.toString()}x)`,
      amount: complexityAdjustment
    },
    {
      kind: "ADJUSTED_SUBTOTAL",
      order: steps.length + 3,
      label: "Complexity-adjusted subtotal",
      amount: adjustedSubtotal
    },
    {
      kind: "DISCOUNT",
      order: steps.length + 4,
      label: `${discount.label} discount (${discount.rate.toString()})`,
      amount: discountAmount
    },
    {
      kind: "FINAL_PROJECT_PRICE",
      order: steps.length + 5,
      label: "Final project price",
      amount: finalProjectPrice
    }
  );

  return {
    valid: true,
    issues: [],
    warnings,
    calculation: {
      currency: configuration.currency,
      pricingConfigurationId: configuration.id,
      pricingConfigurationVersion: configuration.version,
      pricingConfigurationSchemaVersion: configuration.schemaVersion,
      engineVersion: PRICING_ENGINE_VERSION,
      serviceLines: pricedLines,
      projectSubtotal,
      complexityMultiplier,
      complexityAdjustment,
      adjustedSubtotal,
      discountId: discount.id,
      discountRate: discount.rate,
      discountAmount,
      finalProjectPrice,
      steps
    }
  };
}
