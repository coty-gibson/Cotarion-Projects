import type { Decimal } from "@/domain/pricing/decimal";
import type { Money, PricingCurrency } from "@/domain/pricing/money";

export const PRICING_CONFIGURATION_SCHEMA_VERSION = 1 as const;
export const PRICING_ENGINE_VERSION = "pricing-engine/2.0.0" as const;
export const ROUNDING_MODE = "HALF_AWAY_FROM_ZERO" as const;

export interface ServiceCategory {
  id: string;
  name: string;
  displayOrder: number;
}

export interface ProjectService {
  id: string;
  categoryId: string;
  name: string;
  unitPrice: Money;
  currency: PricingCurrency;
  active: boolean;
  displayOrder: number;
}

export interface ComplexityOption {
  id: string;
  label: string;
  increment: Decimal;
  standard: boolean;
  displayOrder: number;
}

export interface ComplexityFactor {
  id: string;
  label: string;
  displayOrder: number;
  options: readonly ComplexityOption[];
}

export interface ProjectDiscount {
  id: string;
  label: string;
  rate: Decimal;
  displayOrder: number;
}

export type PricingModelType =
  "PROJECT" | "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | "HYBRID_RETAINER" | "ADVISORY_HOURLY";

export interface RetainerLevel {
  id: string;
  label: string;
  baseMonthlyFee: Money;
  description: string;
  displayOrder: number;
}

export interface RetainerTerm {
  id: string;
  label: string;
  months: number;
  discountRate: Decimal;
  displayOrder: number;
}

export interface PricingConfiguration {
  id: string;
  version: number;
  schemaVersion: typeof PRICING_CONFIGURATION_SCHEMA_VERSION;
  currency: PricingCurrency;
  roundingMode: typeof ROUNDING_MODE;
  categories: readonly ServiceCategory[];
  services: readonly ProjectService[];
  complexityFactors: readonly ComplexityFactor[];
  discounts: readonly ProjectDiscount[];
  retainerLevels: readonly RetainerLevel[];
  retainerTerms: readonly RetainerTerm[];
  advisoryHourlyRate: Money;
  advisoryIncrementMinutes: 30;
}

export interface ProjectServiceLineInput {
  lineId: string;
  serviceId: string;
  quantity: string;
}

export interface ComplexitySelectionInput {
  factorId: string;
  optionId: string;
}

export interface ProjectPricingInput {
  pricingConfigurationId: string;
  pricingConfigurationVersion: number;
  serviceLines: readonly ProjectServiceLineInput[];
  complexitySelections: readonly ComplexitySelectionInput[];
  discountId: string;
}

export type PricingIssueSeverity = "ERROR" | "WARNING";

export interface PricingIssue {
  code: string;
  message: string;
  path: string;
  severity: PricingIssueSeverity;
}

export interface PricedServiceLine {
  lineId: string;
  serviceId: string;
  serviceName: string;
  categoryId: string;
  quantity: string;
  unitPrice: Money;
  lineTotal: Money;
}

export type PricingCalculationStep =
  | {
      kind: "SERVICE_LINE";
      order: number;
      label: string;
      amount: Money;
      lineId: string;
    }
  | {
      kind:
        | "PROJECT_SUBTOTAL"
        | "COMPLEXITY_ADJUSTMENT"
        | "ADJUSTED_SUBTOTAL"
        | "DISCOUNT"
        | "FINAL_PROJECT_PRICE";
      order: number;
      label: string;
      amount: Money;
    };

export interface ProjectPricingCalculation {
  currency: PricingCurrency;
  pricingConfigurationId: string;
  pricingConfigurationVersion: number;
  pricingConfigurationSchemaVersion: number;
  engineVersion: typeof PRICING_ENGINE_VERSION;
  serviceLines: readonly PricedServiceLine[];
  projectSubtotal: Money;
  complexityMultiplier: Decimal;
  complexityAdjustment: Money;
  adjustedSubtotal: Money;
  discountId: string;
  discountRate: Decimal;
  discountAmount: Money;
  finalProjectPrice: Money;
  steps: readonly PricingCalculationStep[];
}

export type ProjectPricingResult =
  | {
      valid: true;
      calculation: ProjectPricingCalculation;
      issues: readonly PricingIssue[];
      warnings: readonly PricingIssue[];
    }
  | {
      valid: false;
      calculation: null;
      issues: readonly PricingIssue[];
      warnings: readonly PricingIssue[];
    };

export interface AdjustedOperatingProfitMonthInput {
  month: string;
  adjustedOperatingProfit: string;
  adjustmentNotes: string;
}

interface RecurringPricingInputBase {
  pricingConfigurationId: string;
  pricingConfigurationVersion: number;
  retainerLevelId: string;
  complexitySelections: readonly ComplexitySelectionInput[];
}

export interface FixedRetainerPricingInput extends RecurringPricingInputBase {
  pricingModel: "FIXED_RETAINER";
  retainerTermId: string;
  discountId: string;
}

export interface ProfitShareRetainerPricingInput extends RecurringPricingInputBase {
  pricingModel: "PROFIT_SHARE_RETAINER";
  aopMonths: readonly AdjustedOperatingProfitMonthInput[];
}

export interface HybridRetainerPricingInput extends RecurringPricingInputBase {
  pricingModel: "HYBRID_RETAINER";
  fixedMonthlyPayment: string;
  aopMonths: readonly AdjustedOperatingProfitMonthInput[];
}

export type RetainerPricingInput =
  FixedRetainerPricingInput | ProfitShareRetainerPricingInput | HybridRetainerPricingInput;

export interface RetainerPricingCalculation {
  pricingModel: RetainerPricingInput["pricingModel"];
  currency: PricingCurrency;
  pricingConfigurationId: string;
  pricingConfigurationVersion: number;
  pricingConfigurationSchemaVersion: number;
  engineVersion: typeof PRICING_ENGINE_VERSION;
  methodologyVersion: "retainer-pricing/1.0.0";
  retainerLevelId: string;
  baseMonthlyFee: Money;
  complexityMultiplier: Decimal;
  complexityAdjustedMonthlyBase: Money;
  retainerTermId: string | null;
  termDiscountRate: Decimal;
  standardDiscountId: string;
  standardDiscountRate: Decimal;
  totalDiscountRate: Decimal;
  discountAmount: Money;
  fixedMonthlyPayment: Money;
  aopMonths: readonly AdjustedOperatingProfitMonthInput[];
  averageAdjustedOperatingProfit: Money | null;
  profitShareTarget: Money;
  profitShareRate: Decimal;
  estimatedProfitSharePayment: Money;
  estimatedMonthlyValue: Money;
  equivalentPricingModel: "FIXED_RETAINER" | "PROFIT_SHARE_RETAINER" | null;
}

export type RetainerPricingResult =
  | {
      valid: true;
      calculation: RetainerPricingCalculation;
      issues: readonly PricingIssue[];
      warnings: readonly PricingIssue[];
    }
  | {
      valid: false;
      calculation: null;
      issues: readonly PricingIssue[];
      warnings: readonly PricingIssue[];
    };

export interface AdvisoryPricingInput {
  pricingConfigurationId: string;
  pricingConfigurationVersion: number;
  durationMinutes: string;
}

export interface AdvisoryPricingCalculation {
  pricingModel: "ADVISORY_HOURLY";
  currency: PricingCurrency;
  pricingConfigurationId: string;
  pricingConfigurationVersion: number;
  pricingConfigurationSchemaVersion: number;
  engineVersion: typeof PRICING_ENGINE_VERSION;
  methodologyVersion: "advisory-hourly/1.0.0";
  durationMinutes: number;
  billingIncrements: number;
  hourlyRate: Money;
  incrementPrice: Money;
  finalAdvisoryFee: Money;
}

export type AdvisoryPricingResult =
  | {
      valid: true;
      calculation: AdvisoryPricingCalculation;
      issues: readonly PricingIssue[];
      warnings: readonly PricingIssue[];
    }
  | {
      valid: false;
      calculation: null;
      issues: readonly PricingIssue[];
      warnings: readonly PricingIssue[];
    };
