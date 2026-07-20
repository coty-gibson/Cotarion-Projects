import { Decimal } from "@/domain/pricing/decimal";
import { Money } from "@/domain/pricing/money";
import {
  PRICING_ENGINE_VERSION,
  type AdvisoryPricingInput,
  type AdvisoryPricingResult,
  type AdjustedOperatingProfitMonthInput,
  type ComplexitySelectionInput,
  type PricingConfiguration,
  type PricingIssue,
  type RetainerPricingInput,
  type RetainerPricingResult
} from "@/domain/pricing/types";
import { validatePricingConfiguration } from "@/domain/pricing/validation";

const SIGNED_USD_PATTERN = /^-?(?:0|[1-9]\d*)\.\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function error(code: string, message: string, path: string): PricingIssue {
  return { code, message, path, severity: "ERROR" };
}

function warning(code: string, message: string, path: string): PricingIssue {
  return { code, message, path, severity: "WARNING" };
}

function signedMinorUnits(value: string) {
  if (!SIGNED_USD_PATTERN.test(value)) return null;
  const negative = value.startsWith("-");
  const digits = (negative ? value.slice(1) : value).replace(".", "");
  return BigInt(`${negative ? "-" : ""}${digits}`);
}

function roundDivide(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const absoluteRemainder = remainder < BigInt(0) ? -remainder : remainder;
  if (absoluteRemainder * BigInt(2) < denominator) return quotient;
  return quotient + (numerator < BigInt(0) ? BigInt(-1) : BigInt(1));
}

function rateFromHalfPercentUnits(units: bigint) {
  const thousandths = units * BigInt(5);
  const digits = thousandths.toString().padStart(4, "0");
  return Decimal.parse(`${digits.slice(0, -3)}.${digits.slice(-3)}`);
}

function validateConfigurationReference(
  input: { pricingConfigurationId: string; pricingConfigurationVersion: number },
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
  return issues;
}

function selectedComplexity(
  selections: readonly ComplexitySelectionInput[],
  configuration: PricingConfiguration,
  issues: PricingIssue[]
) {
  const byFactor = new Map<string, string[]>();
  for (const selection of selections) {
    const values = byFactor.get(selection.factorId) ?? [];
    values.push(selection.optionId);
    byFactor.set(selection.factorId, values);
  }

  const selected = new Map<string, Decimal>();
  for (const factor of configuration.complexityFactors) {
    const optionIds = byFactor.get(factor.id) ?? [];
    if (optionIds.length !== 1) {
      issues.push(
        error(
          "COMPLEXITY_SELECTION_COUNT_INVALID",
          `Select exactly one option for ${factor.label}.`,
          `complexitySelections.${factor.id}`
        )
      );
      continue;
    }
    const option = factor.options.find(({ id }) => id === optionIds[0]);
    if (!option) {
      issues.push(
        error(
          "COMPLEXITY_OPTION_MISMATCH",
          `Select a valid option for ${factor.label}.`,
          `complexitySelections.${factor.id}`
        )
      );
      continue;
    }
    selected.set(factor.id, option.increment);
  }

  for (const factorId of byFactor.keys()) {
    if (!configuration.complexityFactors.some(({ id }) => id === factorId)) {
      issues.push(
        error(
          "COMPLEXITY_FACTOR_UNKNOWN",
          "Complexity selection must reference a configured factor.",
          "complexitySelections"
        )
      );
    }
  }
  return selected;
}

function validateAopMonths(
  months: readonly AdjustedOperatingProfitMonthInput[],
  issues: PricingIssue[]
) {
  if (months.length !== 3) {
    issues.push(
      error(
        "AOP_THREE_MONTHS_REQUIRED",
        "Enter the three most recently completed months of Adjusted Operating Profit.",
        "aopMonths"
      )
    );
    return null;
  }

  const parsed = months.map((month, index) => {
    if (!MONTH_PATTERN.test(month.month)) {
      issues.push(
        error(
          "AOP_MONTH_INVALID",
          "Use YYYY-MM for each completed month.",
          `aopMonths[${index}].month`
        )
      );
    }
    const amount = signedMinorUnits(month.adjustedOperatingProfit);
    if (amount === null) {
      issues.push(
        error(
          "AOP_AMOUNT_INVALID",
          "Adjusted Operating Profit must be a signed USD amount with two decimals.",
          `aopMonths[${index}].adjustedOperatingProfit`
        )
      );
    }
    return { month: month.month, amount };
  });
  if (new Set(months.map(({ month }) => month)).size !== months.length) {
    issues.push(error("AOP_MONTH_DUPLICATE", "Each AOP month must be unique.", "aopMonths"));
  }
  if (issues.some(({ code }) => code.startsWith("AOP_"))) return null;

  const monthIndexes = parsed
    .map(({ month }) => {
      const [year, monthNumber] = month.split("-").map(Number);
      return year * 12 + monthNumber - 1;
    })
    .sort((left, right) => left - right);
  if (monthIndexes[1] !== monthIndexes[0] + 1 || monthIndexes[2] !== monthIndexes[1] + 1) {
    issues.push(
      error(
        "AOP_MONTHS_NOT_CONSECUTIVE",
        "Adjusted Operating Profit must use three consecutive completed months.",
        "aopMonths"
      )
    );
    return null;
  }

  const sum = parsed.reduce((total, { amount }) => total + amount!, BigInt(0));
  const average = roundDivide(sum, BigInt(3));
  if (average <= BigInt(0)) {
    issues.push(
      error(
        "AOP_AVERAGE_NOT_POSITIVE",
        "Automated percentage pricing requires a positive three-month average Adjusted Operating Profit.",
        "aopMonths"
      )
    );
    return null;
  }
  return Money.fromMinorUnits(average);
}

export function calculateRetainerPricing(
  input: RetainerPricingInput,
  configuration: PricingConfiguration
): RetainerPricingResult {
  const issues = validateConfigurationReference(input, configuration);
  const warnings: PricingIssue[] = [];
  const level = configuration.retainerLevels.find(({ id }) => id === input.retainerLevelId);
  if (!level) {
    issues.push(
      error(
        "RETAINER_LEVEL_UNKNOWN",
        "Select a configured Retainer service level.",
        "retainerLevelId"
      )
    );
  }
  const selected = selectedComplexity(input.complexitySelections, configuration, issues);
  const retainerFactorIds = [
    "multi-location",
    "multi-department",
    "condition-severity",
    "industry-severity"
  ];
  const includedIncrement = retainerFactorIds.reduce(
    (sum, factorId) => sum.add(selected.get(factorId) ?? Decimal.zero()),
    Decimal.zero()
  );
  const complexityMultiplier = Decimal.one().add(includedIncrement.half());

  let termId: string | null = null;
  let termDiscountRate = Decimal.zero();
  let standardDiscountId = "none";
  let standardDiscountRate = Decimal.zero();
  let fixedMonthlyPaymentInput: Money | null = null;
  let aopAverage: Money | null = null;

  if (input.pricingModel === "FIXED_RETAINER") {
    const term = configuration.retainerTerms.find(({ id }) => id === input.retainerTermId);
    if (!term) {
      issues.push(
        error("RETAINER_TERM_UNKNOWN", "Select a configured Retainer term.", "retainerTermId")
      );
    } else {
      termId = term.id;
      termDiscountRate = term.discountRate;
    }
    const discount = configuration.discounts.find(({ id }) => id === input.discountId);
    if (!discount) {
      issues.push(error("DISCOUNT_UNKNOWN", "Select one configured discount.", "discountId"));
    } else {
      standardDiscountId = discount.id;
      standardDiscountRate = discount.rate;
    }
  } else if (input.pricingModel === "HYBRID_RETAINER") {
    try {
      fixedMonthlyPaymentInput = Money.usd(input.fixedMonthlyPayment);
    } catch {
      issues.push(
        error(
          "HYBRID_FIXED_PAYMENT_INVALID",
          "Fixed monthly payment must be a non-negative USD amount with two decimals.",
          "fixedMonthlyPayment"
        )
      );
    }
  }

  if (issues.some(({ severity }) => severity === "ERROR") || !level) {
    return { valid: false, calculation: null, issues, warnings };
  }

  const adjustedBase = level.baseMonthlyFee.multiplyAndRound(complexityMultiplier);
  if (
    input.pricingModel === "HYBRID_RETAINER" &&
    fixedMonthlyPaymentInput &&
    fixedMonthlyPaymentInput.toMinorUnits() > adjustedBase.toMinorUnits()
  ) {
    issues.push(
      error(
        "HYBRID_FIXED_PAYMENT_EXCEEDS_BASE",
        "Fixed monthly payment cannot exceed the complexity-adjusted monthly Retainer base.",
        "fixedMonthlyPayment"
      )
    );
  }
  if (issues.some(({ severity }) => severity === "ERROR")) {
    return { valid: false, calculation: null, issues, warnings };
  }

  let fixedMonthlyPayment = Money.zero();
  let profitShareTarget = Money.zero();
  let profitShareRate = Decimal.zero();
  let estimatedProfitSharePayment = Money.zero();
  let equivalentPricingModel: "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | null = null;

  if (input.pricingModel === "FIXED_RETAINER") {
    const combined = termDiscountRate.add(standardDiscountRate);
    const totalDiscountRate = combined.compare(Decimal.one()) > 0 ? Decimal.one() : combined;
    const discountAmount = adjustedBase.multiplyAndRound(totalDiscountRate);
    fixedMonthlyPayment = adjustedBase.subtract(discountAmount);
    if (fixedMonthlyPayment.equals(Money.zero())) {
      warnings.push(
        warning(
          "ZERO_DOLLAR_FIXED_RETAINER",
          "This Fixed Retainer produces a zero-dollar monthly fee. Confirm the authorized Pro Bono arrangement.",
          "discountId"
        )
      );
    }
    return {
      valid: true,
      issues: [],
      warnings,
      calculation: {
        pricingModel: input.pricingModel,
        currency: configuration.currency,
        pricingConfigurationId: configuration.id,
        pricingConfigurationVersion: configuration.version,
        pricingConfigurationSchemaVersion: configuration.schemaVersion,
        engineVersion: PRICING_ENGINE_VERSION,
        methodologyVersion: "retainer-pricing/1.0.0",
        retainerLevelId: level.id,
        baseMonthlyFee: level.baseMonthlyFee,
        complexityMultiplier,
        complexityAdjustedMonthlyBase: adjustedBase,
        retainerTermId: termId,
        termDiscountRate,
        standardDiscountId,
        standardDiscountRate,
        totalDiscountRate,
        discountAmount,
        fixedMonthlyPayment,
        aopMonths: [],
        averageAdjustedOperatingProfit: null,
        profitShareTarget,
        profitShareRate,
        estimatedProfitSharePayment,
        estimatedMonthlyValue: fixedMonthlyPayment,
        equivalentPricingModel
      }
    };
  }

  if (input.pricingModel === "HYBRID_RETAINER" && fixedMonthlyPaymentInput) {
    fixedMonthlyPayment = fixedMonthlyPaymentInput;
    if (fixedMonthlyPayment.equals(Money.zero())) {
      equivalentPricingModel = "PROFIT_SHARE_RETAINER";
      warnings.push(
        warning(
          "HYBRID_EQUIVALENT_PROFIT_SHARE",
          "A zero fixed payment is economically equivalent to full Profit-Share pricing.",
          "fixedMonthlyPayment"
        )
      );
    } else if (fixedMonthlyPayment.equals(adjustedBase)) {
      equivalentPricingModel = "FIXED_RETAINER";
      warnings.push(
        warning(
          "HYBRID_EQUIVALENT_FIXED",
          "A fixed payment equal to the adjusted base is economically equivalent to Fixed pricing.",
          "fixedMonthlyPayment"
        )
      );
    }
  }

  const uncoveredBase =
    input.pricingModel === "HYBRID_RETAINER"
      ? adjustedBase.subtract(fixedMonthlyPayment)
      : adjustedBase;
  profitShareTarget = uncoveredBase.multiplyAndRound(Decimal.parse("1.25"));

  if (!profitShareTarget.equals(Money.zero())) {
    aopAverage = validateAopMonths(input.aopMonths, issues);
    if (aopAverage) {
      const halfPercentUnits = roundDivide(
        profitShareTarget.toMinorUnits() * BigInt(200),
        aopAverage.toMinorUnits()
      );
      profitShareRate = rateFromHalfPercentUnits(halfPercentUnits);
      estimatedProfitSharePayment = aopAverage.multiplyAndRound(profitShareRate);
    }
  }

  if (issues.some(({ severity }) => severity === "ERROR")) {
    return { valid: false, calculation: null, issues, warnings };
  }

  return {
    valid: true,
    issues: [],
    warnings,
    calculation: {
      pricingModel: input.pricingModel,
      currency: configuration.currency,
      pricingConfigurationId: configuration.id,
      pricingConfigurationVersion: configuration.version,
      pricingConfigurationSchemaVersion: configuration.schemaVersion,
      engineVersion: PRICING_ENGINE_VERSION,
      methodologyVersion: "retainer-pricing/1.0.0",
      retainerLevelId: level.id,
      baseMonthlyFee: level.baseMonthlyFee,
      complexityMultiplier,
      complexityAdjustedMonthlyBase: adjustedBase,
      retainerTermId: null,
      termDiscountRate: Decimal.zero(),
      standardDiscountId: "none",
      standardDiscountRate: Decimal.zero(),
      totalDiscountRate: Decimal.zero(),
      discountAmount: Money.zero(),
      fixedMonthlyPayment,
      aopMonths: input.aopMonths.map((month) => ({ ...month })),
      averageAdjustedOperatingProfit: aopAverage,
      profitShareTarget,
      profitShareRate,
      estimatedProfitSharePayment,
      estimatedMonthlyValue: fixedMonthlyPayment.add(estimatedProfitSharePayment),
      equivalentPricingModel
    }
  };
}

export function calculateAdvisoryPricing(
  input: AdvisoryPricingInput,
  configuration: PricingConfiguration
): AdvisoryPricingResult {
  const issues = validateConfigurationReference(input, configuration);
  if (!/^[1-9]\d*$/.test(input.durationMinutes)) {
    issues.push(
      error(
        "ADVISORY_DURATION_INVALID",
        "Advisory duration must be at least 30 minutes in 30-minute increments.",
        "durationMinutes"
      )
    );
  }
  const duration = Number(input.durationMinutes);
  if (
    Number.isSafeInteger(duration) &&
    (duration < configuration.advisoryIncrementMinutes ||
      duration % configuration.advisoryIncrementMinutes !== 0)
  ) {
    issues.push(
      error(
        "ADVISORY_INCREMENT_INVALID",
        "Advisory Consulting is billed in 30-minute increments with a 30-minute minimum.",
        "durationMinutes"
      )
    );
  }
  if (issues.some(({ severity }) => severity === "ERROR")) {
    return { valid: false, calculation: null, issues, warnings: [] };
  }

  const increments = duration / configuration.advisoryIncrementMinutes;
  const incrementPrice = configuration.advisoryHourlyRate.multiplyAndRound(Decimal.parse("0.5"));
  const finalFee = Money.fromMinorUnits(incrementPrice.toMinorUnits() * BigInt(increments));
  return {
    valid: true,
    issues: [],
    warnings: [],
    calculation: {
      pricingModel: "ADVISORY_HOURLY",
      currency: configuration.currency,
      pricingConfigurationId: configuration.id,
      pricingConfigurationVersion: configuration.version,
      pricingConfigurationSchemaVersion: configuration.schemaVersion,
      engineVersion: PRICING_ENGINE_VERSION,
      methodologyVersion: "advisory-hourly/1.0.0",
      durationMinutes: duration,
      billingIncrements: increments,
      hourlyRate: configuration.advisoryHourlyRate,
      incrementPrice,
      finalAdvisoryFee: finalFee
    }
  };
}
