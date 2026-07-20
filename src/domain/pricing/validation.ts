import { Decimal } from "@/domain/pricing/decimal";
import { PRICING_CURRENCY } from "@/domain/pricing/money";
import {
  PRICING_CONFIGURATION_SCHEMA_VERSION,
  ROUNDING_MODE,
  type PricingConfiguration,
  type PricingIssue,
  type ProjectPricingInput
} from "@/domain/pricing/types";

const QUANTITY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

function error(code: string, message: string, path: string): PricingIssue {
  return { code, message, path, severity: "ERROR" };
}

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return duplicates;
}

export function validatePricingConfiguration(configuration: PricingConfiguration) {
  const issues: PricingIssue[] = [];

  if (!configuration.id.trim()) {
    issues.push(error("CONFIGURATION_ID_REQUIRED", "Configuration ID is required.", "id"));
  }
  if (!Number.isSafeInteger(configuration.version) || configuration.version < 1) {
    issues.push(
      error(
        "CONFIGURATION_VERSION_INVALID",
        "Configuration version must be a positive integer.",
        "version"
      )
    );
  }
  if (configuration.schemaVersion !== PRICING_CONFIGURATION_SCHEMA_VERSION) {
    issues.push(
      error(
        "CONFIGURATION_SCHEMA_UNSUPPORTED",
        `Configuration schema must be ${PRICING_CONFIGURATION_SCHEMA_VERSION}.`,
        "schemaVersion"
      )
    );
  }
  if (configuration.currency !== PRICING_CURRENCY) {
    issues.push(error("CURRENCY_UNSUPPORTED", "Only USD is supported.", "currency"));
  }
  if (configuration.roundingMode !== ROUNDING_MODE) {
    issues.push(
      error("ROUNDING_MODE_UNSUPPORTED", `Rounding mode must be ${ROUNDING_MODE}.`, "roundingMode")
    );
  }
  if (configuration.categories.length === 0) {
    issues.push(
      error("CATEGORY_REQUIRED", "At least one service category is required.", "categories")
    );
  }
  if (configuration.services.length === 0) {
    issues.push(error("SERVICE_REQUIRED", "At least one project service is required.", "services"));
  }
  if (configuration.complexityFactors.length === 0) {
    issues.push(
      error(
        "COMPLEXITY_FACTOR_REQUIRED",
        "At least one complexity factor is required.",
        "complexityFactors"
      )
    );
  }
  if (configuration.discounts.length === 0) {
    issues.push(error("DISCOUNT_REQUIRED", "At least one discount is required.", "discounts"));
  }
  if (configuration.retainerLevels.length === 0) {
    issues.push(
      error("RETAINER_LEVEL_REQUIRED", "At least one Retainer level is required.", "retainerLevels")
    );
  }
  if (configuration.retainerTerms.length === 0) {
    issues.push(
      error("RETAINER_TERM_REQUIRED", "At least one Retainer term is required.", "retainerTerms")
    );
  }
  if (
    configuration.advisoryHourlyRate.toMinorUnits() !== BigInt(25000) ||
    configuration.advisoryIncrementMinutes !== 30
  ) {
    issues.push(
      error(
        "ADVISORY_CONFIGURATION_INVALID",
        "Version 1 Advisory Consulting must use $250 per hour in 30-minute increments.",
        "advisoryHourlyRate"
      )
    );
  }

  for (const id of duplicateValues(configuration.categories.map(({ id }) => id))) {
    issues.push(error("CATEGORY_ID_DUPLICATE", `Duplicate category ID: ${id}.`, "categories"));
  }
  for (const id of duplicateValues(configuration.services.map(({ id }) => id))) {
    issues.push(error("SERVICE_ID_DUPLICATE", `Duplicate service ID: ${id}.`, "services"));
  }
  for (const id of duplicateValues(configuration.complexityFactors.map(({ id }) => id))) {
    issues.push(
      error("COMPLEXITY_FACTOR_ID_DUPLICATE", `Duplicate factor ID: ${id}.`, "complexityFactors")
    );
  }
  for (const id of duplicateValues(configuration.discounts.map(({ id }) => id))) {
    issues.push(error("DISCOUNT_ID_DUPLICATE", `Duplicate discount ID: ${id}.`, "discounts"));
  }

  const categoryIds = new Set(configuration.categories.map(({ id }) => id));
  configuration.services.forEach((service, index) => {
    if (!categoryIds.has(service.categoryId)) {
      issues.push(
        error(
          "SERVICE_CATEGORY_UNKNOWN",
          `Service ${service.id} references an unknown category.`,
          `services[${index}].categoryId`
        )
      );
    }
    if (
      service.currency !== configuration.currency ||
      service.unitPrice.currency !== configuration.currency
    ) {
      issues.push(
        error(
          "SERVICE_CURRENCY_MISMATCH",
          `Service ${service.id} must use ${configuration.currency}.`,
          `services[${index}].currency`
        )
      );
    }
  });

  configuration.complexityFactors.forEach((factor, factorIndex) => {
    if (factor.options.length === 0) {
      issues.push(
        error(
          "COMPLEXITY_OPTION_REQUIRED",
          `Complexity factor ${factor.id} must define options.`,
          `complexityFactors[${factorIndex}].options`
        )
      );
      return;
    }

    for (const id of duplicateValues(factor.options.map(({ id }) => id))) {
      issues.push(
        error(
          "COMPLEXITY_OPTION_ID_DUPLICATE",
          `Factor ${factor.id} has duplicate option ID ${id}.`,
          `complexityFactors[${factorIndex}].options`
        )
      );
    }

    const standardOptions = factor.options.filter(({ standard }) => standard);
    if (standardOptions.length !== 1 || !standardOptions[0]?.increment.isZero()) {
      issues.push(
        error(
          "COMPLEXITY_STANDARD_INVALID",
          `Factor ${factor.id} must have exactly one Standard option with a 0.00 increment.`,
          `complexityFactors[${factorIndex}].options`
        )
      );
    }

    factor.options.forEach((option, optionIndex) => {
      if (option.increment.isNegative()) {
        issues.push(
          error(
            "COMPLEXITY_INCREMENT_NEGATIVE",
            "Complexity increments cannot be negative.",
            `complexityFactors[${factorIndex}].options[${optionIndex}].increment`
          )
        );
      }
    });
  });

  configuration.discounts.forEach((discount, index) => {
    if (discount.rate.isNegative() || discount.rate.compare(Decimal.one()) > 0) {
      issues.push(
        error(
          "DISCOUNT_RATE_INVALID",
          "Discount rates must be between 0 and 1.",
          `discounts[${index}].rate`
        )
      );
    }
  });

  for (const id of duplicateValues(configuration.retainerLevels.map(({ id }) => id))) {
    issues.push(
      error("RETAINER_LEVEL_ID_DUPLICATE", `Duplicate Retainer level ID: ${id}.`, "retainerLevels")
    );
  }
  for (const id of duplicateValues(configuration.retainerTerms.map(({ id }) => id))) {
    issues.push(
      error("RETAINER_TERM_ID_DUPLICATE", `Duplicate Retainer term ID: ${id}.`, "retainerTerms")
    );
  }
  configuration.retainerTerms.forEach((term, index) => {
    if (
      !Number.isSafeInteger(term.months) ||
      term.months < 1 ||
      term.discountRate.isNegative() ||
      term.discountRate.compare(Decimal.one()) > 0
    ) {
      issues.push(
        error(
          "RETAINER_TERM_INVALID",
          "Retainer terms require positive months and a discount between 0 and 1.",
          `retainerTerms[${index}]`
        )
      );
    }
  });

  return issues;
}

export function validateProjectPricingInput(
  input: ProjectPricingInput,
  configuration: PricingConfiguration
) {
  const issues = [...validatePricingConfiguration(configuration)];

  if (
    input.pricingConfigurationId !== configuration.id ||
    input.pricingConfigurationVersion !== configuration.version
  ) {
    issues.push(
      error(
        "CONFIGURATION_VERSION_MISMATCH",
        "Input must reference the supplied Pricing Configuration ID and version.",
        "pricingConfigurationVersion"
      )
    );
  }

  if (input.serviceLines.length === 0) {
    issues.push(
      error("SERVICE_LINE_REQUIRED", "At least one service line is required.", "serviceLines")
    );
  }

  const services = new Map(configuration.services.map((service) => [service.id, service]));
  for (const lineId of duplicateValues(input.serviceLines.map(({ lineId }) => lineId))) {
    issues.push(
      error("SERVICE_LINE_ID_DUPLICATE", `Duplicate service line ID: ${lineId}.`, "serviceLines")
    );
  }

  input.serviceLines.forEach((line, index) => {
    const service = services.get(line.serviceId);
    if (!service) {
      issues.push(
        error(
          "SERVICE_UNKNOWN",
          "Service line must reference a configured service.",
          `serviceLines[${index}].serviceId`
        )
      );
    } else if (!service.active) {
      issues.push(
        error(
          "SERVICE_INACTIVE",
          "Service line must reference an active service.",
          `serviceLines[${index}].serviceId`
        )
      );
    }

    if (!QUANTITY_PATTERN.test(line.quantity)) {
      issues.push(
        error(
          "QUANTITY_INVALID",
          "Quantity must be greater than zero with no more than two decimal places.",
          `serviceLines[${index}].quantity`
        )
      );
    } else if (Decimal.parse(line.quantity).isZero()) {
      issues.push(
        error(
          "QUANTITY_NOT_POSITIVE",
          "Quantity must be greater than zero.",
          `serviceLines[${index}].quantity`
        )
      );
    }
  });

  const selectionsByFactor = new Map<string, string[]>();
  input.complexitySelections.forEach(({ factorId, optionId }) => {
    const selections = selectionsByFactor.get(factorId) ?? [];
    selections.push(optionId);
    selectionsByFactor.set(factorId, selections);
  });

  const factors = new Map(configuration.complexityFactors.map((factor) => [factor.id, factor]));
  input.complexitySelections.forEach((selection, index) => {
    const factor = factors.get(selection.factorId);
    if (!factor) {
      issues.push(
        error(
          "COMPLEXITY_FACTOR_UNKNOWN",
          "Complexity selection must reference a configured factor.",
          `complexitySelections[${index}].factorId`
        )
      );
    } else if (!factor.options.some(({ id }) => id === selection.optionId)) {
      issues.push(
        error(
          "COMPLEXITY_OPTION_MISMATCH",
          "Complexity option must belong to its selected factor.",
          `complexitySelections[${index}].optionId`
        )
      );
    }
  });

  configuration.complexityFactors.forEach((factor) => {
    const count = selectionsByFactor.get(factor.id)?.length ?? 0;
    if (count !== 1) {
      issues.push(
        error(
          "COMPLEXITY_SELECTION_COUNT_INVALID",
          `Select exactly one option for ${factor.label}.`,
          `complexitySelections.${factor.id}`
        )
      );
    }
  });

  if (!configuration.discounts.some(({ id }) => id === input.discountId)) {
    issues.push(error("DISCOUNT_UNKNOWN", "Select one configured discount.", "discountId"));
  }

  return issues;
}
