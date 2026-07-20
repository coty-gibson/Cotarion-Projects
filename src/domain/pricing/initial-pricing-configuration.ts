import { Decimal } from "@/domain/pricing/decimal";
import { Money, PRICING_CURRENCY } from "@/domain/pricing/money";
import {
  PRICING_CONFIGURATION_SCHEMA_VERSION,
  ROUNDING_MODE,
  type ComplexityFactor,
  type PricingConfiguration,
  type ProjectDiscount,
  type ProjectService,
  type RetainerLevel,
  type RetainerTerm,
  type ServiceCategory
} from "@/domain/pricing/types";

export const INITIAL_PRICING_CONFIGURATION_ID = "project-pricing-baseline";

export const INITIAL_SERVICE_CATEGORIES = [
  { id: "diagnostics", name: "Diagnostics", displayOrder: 1 },
  { id: "core-packages", name: "Core Packages", displayOrder: 2 },
  { id: "training-programs", name: "Training Programs", displayOrder: 3 },
  { id: "coaching-programs", name: "Coaching Programs", displayOrder: 4 },
  { id: "add-ons", name: "Add-Ons", displayOrder: 5 }
] as const satisfies readonly ServiceCategory[];

function service(
  id: string,
  categoryId: string,
  name: string,
  unitPrice: string,
  displayOrder: number
): ProjectService {
  return {
    id,
    categoryId,
    name,
    unitPrice: Money.usd(unitPrice),
    currency: PRICING_CURRENCY,
    active: true,
    displayOrder
  };
}

export const INITIAL_PROJECT_SERVICES = [
  service("svc-business-strategy-session", "diagnostics", "Business Strategy Session", "250.00", 1),
  service(
    "svc-client-experience-diagnostic",
    "diagnostics",
    "Client Experience Diagnostic",
    "350.00",
    2
  ),
  service(
    "svc-operational-efficiency-diagnostic",
    "diagnostics",
    "Operational Efficiency Diagnostic",
    "350.00",
    3
  ),
  service(
    "svc-business-launch-foundation-package",
    "core-packages",
    "Business Launch & Foundation Package",
    "3000.00",
    4
  ),
  service(
    "svc-operations-optimization-package",
    "core-packages",
    "Operations Optimization Package",
    "6500.00",
    5
  ),
  service(
    "svc-leadership-team-excellence-package",
    "core-packages",
    "Leadership & Team Excellence Package",
    "4500.00",
    6
  ),
  service(
    "svc-client-experience-growth-package",
    "core-packages",
    "Client Experience & Growth Package",
    "5000.00",
    7
  ),
  service(
    "svc-associate-cx-training-basic",
    "training-programs",
    "Associate Client Experience Training Basic (2 hours)",
    "400.00",
    8
  ),
  service(
    "svc-associate-cx-training-half-day",
    "training-programs",
    "Associate Client Experience Extended Half-Day",
    "900.00",
    9
  ),
  service(
    "svc-associate-cx-training-full-day",
    "training-programs",
    "Associate Client Experience Extended Full-Day",
    "1500.00",
    10
  ),
  service(
    "svc-sales-training-basic",
    "training-programs",
    "Sales Skill Development Training Basic (2 hours)",
    "450.00",
    11
  ),
  service(
    "svc-sales-training-half-day",
    "training-programs",
    "Sales Skill Development Extended Half-Day",
    "1000.00",
    12
  ),
  service(
    "svc-sales-training-full-day",
    "training-programs",
    "Sales Skill Development Extended Full-Day",
    "1800.00",
    13
  ),
  service(
    "svc-manager-leadership-training-basic",
    "training-programs",
    "Manager & Leadership Training Basic (2 hours)",
    "500.00",
    14
  ),
  service(
    "svc-manager-leadership-training-half-day",
    "training-programs",
    "Manager & Leadership Extended Half-Day",
    "1200.00",
    15
  ),
  service(
    "svc-manager-leadership-training-full-day",
    "training-programs",
    "Manager & Leadership Extended Full-Day",
    "2000.00",
    16
  ),
  service(
    "svc-team-coaching-basic",
    "coaching-programs",
    "Team Coaching Basic (60 minutes)",
    "250.00",
    17
  ),
  service(
    "svc-team-coaching-half-day",
    "coaching-programs",
    "Team Coaching Extended Half-Day",
    "600.00",
    18
  ),
  service(
    "svc-team-coaching-full-day",
    "coaching-programs",
    "Team Coaching Extended Full-Day",
    "1000.00",
    19
  ),
  service(
    "svc-team-coaching-three-session",
    "coaching-programs",
    "Team Coaching – 3 Session Bundle (60 minutes each)",
    "600.00",
    20
  ),
  service(
    "svc-team-coaching-five-session",
    "coaching-programs",
    "Team Coaching – 5 Session Bundle (60 minutes each)",
    "1000.00",
    21
  ),
  service(
    "svc-process-coaching-session",
    "coaching-programs",
    "Process Coaching Session (60 minutes)",
    "300.00",
    22
  ),
  service(
    "svc-advanced-process-coaching-session",
    "coaching-programs",
    "Advanced Process Coaching Session (90 minutes)",
    "450.00",
    23
  ),
  service("svc-simple-sop", "add-ons", "Simple SOP", "75.00", 24),
  service("svc-complex-sop", "add-ons", "Complex SOP", "150.00", 25),
  service("svc-simple-workflow", "add-ons", "Simple Workflow", "300.00", 26),
  service("svc-complex-workflow", "add-ons", "Complex Workflow", "500.00", 27),
  service("svc-one-week-extension", "add-ons", "1-Week Extension", "300.00", 28),
  service("svc-one-month-support", "add-ons", "1-Month Support", "900.00", 29)
] as const satisfies readonly ProjectService[];

function factor(
  id: string,
  label: string,
  displayOrder: number,
  options: readonly [id: string, label: string, increment: string][]
): ComplexityFactor {
  return {
    id,
    label,
    displayOrder,
    options: [
      {
        id: `${id}-standard`,
        label: "Standard",
        increment: Decimal.zero(),
        standard: true,
        displayOrder: 1
      },
      ...options.map(([optionId, optionLabel, increment], index) => ({
        id: optionId,
        label: optionLabel,
        increment: Decimal.parse(increment),
        standard: false,
        displayOrder: index + 2
      }))
    ]
  };
}

export const INITIAL_COMPLEXITY_FACTORS = [
  factor("business-size", "Business Size", 1, [
    ["business-size-6-15", "6–15 people", "0.10"],
    ["business-size-16-40", "16–40 people", "0.20"],
    ["business-size-41-plus", "41+ people", "0.30"]
  ]),
  factor("multi-location", "Multi-Location", 2, [
    ["multi-location-2-3", "2–3 locations", "0.10"],
    ["multi-location-4-7", "4–7 locations", "0.20"],
    ["multi-location-8-plus", "8+ locations", "0.30"]
  ]),
  factor("multi-department", "Multi-Department", 3, [
    ["multi-department-3-4", "3–4 departments", "0.10"],
    ["multi-department-5-7", "5–7 departments", "0.20"],
    ["multi-department-8-plus", "8+ departments", "0.30"]
  ]),
  factor("condition-severity", "Condition Severity", 4, [
    ["condition-noticeable", "Noticeable Operational Issues", "0.15"],
    ["condition-severe", "Severe Dysfunction", "0.25"],
    ["condition-crisis", "Crisis Condition", "0.40"]
  ]),
  factor("industry-severity", "Industry Severity", 5, [
    ["industry-moderate", "Moderate Complexity Industries", "0.10"],
    ["industry-high", "High Complexity Industries", "0.20"],
    ["industry-very-high", "Very High Complexity Industries", "0.30"]
  ]),
  factor("urgency-timeline", "Urgency / Timeline", 6, [
    ["urgency-accelerated", "Accelerated Timeline", "0.20"],
    ["urgency-critical", "Urgent / Critical Timeline", "0.35"]
  ])
] as const satisfies readonly ComplexityFactor[];

export const INITIAL_PROJECT_DISCOUNTS = [
  {
    id: "none",
    label: "None",
    rate: Decimal.zero(),
    displayOrder: 1
  },
  {
    id: "pro-bono-volunteer",
    label: "Pro Bono / Volunteer",
    rate: Decimal.one(),
    displayOrder: 2
  },
  {
    id: "nonprofit",
    label: "Nonprofit",
    rate: Decimal.parse("0.10"),
    displayOrder: 3
  },
  {
    id: "veteran-owned",
    label: "Veteran-Owned",
    rate: Decimal.parse("0.10"),
    displayOrder: 4
  }
] as const satisfies readonly ProjectDiscount[];

export const INITIAL_RETAINER_LEVELS = [
  {
    id: "advisory",
    label: "Advisory",
    baseMonthlyFee: Money.usd("1000.00"),
    description: "Monthly strategic advisory support",
    displayOrder: 1
  },
  {
    id: "strategic",
    label: "Strategic",
    baseMonthlyFee: Money.usd("2000.00"),
    description: "Every-other-week strategic support",
    displayOrder: 2
  },
  {
    id: "embedded",
    label: "Embedded",
    baseMonthlyFee: Money.usd("3500.00"),
    description: "Weekly embedded support",
    displayOrder: 3
  }
] as const satisfies readonly RetainerLevel[];

export const INITIAL_RETAINER_TERMS = [
  {
    id: "3-month",
    label: "3 Months",
    months: 3,
    discountRate: Decimal.zero(),
    displayOrder: 1
  },
  {
    id: "6-month",
    label: "6 Months",
    months: 6,
    discountRate: Decimal.parse("0.05"),
    displayOrder: 2
  },
  {
    id: "12-month",
    label: "12 Months",
    months: 12,
    discountRate: Decimal.parse("0.10"),
    displayOrder: 3
  }
] as const satisfies readonly RetainerTerm[];

export const INITIAL_PRICING_CONFIGURATION: PricingConfiguration = {
  id: INITIAL_PRICING_CONFIGURATION_ID,
  version: 2,
  schemaVersion: PRICING_CONFIGURATION_SCHEMA_VERSION,
  currency: PRICING_CURRENCY,
  roundingMode: ROUNDING_MODE,
  categories: INITIAL_SERVICE_CATEGORIES,
  services: INITIAL_PROJECT_SERVICES,
  complexityFactors: INITIAL_COMPLEXITY_FACTORS,
  discounts: INITIAL_PROJECT_DISCOUNTS,
  retainerLevels: INITIAL_RETAINER_LEVELS,
  retainerTerms: INITIAL_RETAINER_TERMS,
  advisoryHourlyRate: Money.usd("250.00"),
  advisoryIncrementMinutes: 30
};
