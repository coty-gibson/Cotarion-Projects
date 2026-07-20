import {
  ENGAGEMENT_TYPE_POLICY_VERSION,
  type ConsultingPricingModel
} from "@/domain/proposals/contracts";

export type ConsultingEngagementTypeCode =
  "STRATEGY_SESSION" | "ADVISORY" | "DIAGNOSTIC" | "PROJECT" | "RETAINER";

export type BillingMethod =
  | "ONE_TIME_PREPAID"
  | "TIME_BASED_30_MINUTE"
  | "PRICING_PROJECT_PAYMENT_SCHEDULE"
  | "RECURRING_MONTHLY";

export interface EngagementWorkflowStep {
  readonly code: string;
  readonly label: string;
  readonly terminal: boolean;
}

export interface EngagementWorkflowTransition {
  readonly from: string;
  readonly to: string;
}

export interface EngagementTypePolicyV1 {
  readonly policyVersion: typeof ENGAGEMENT_TYPE_POLICY_VERSION;
  readonly operatingGroupCode: "CONSULTING";
  readonly code: ConsultingEngagementTypeCode;
  readonly name: string;
  readonly proposalRequired: boolean;
  readonly directEngagementPermitted: boolean;
  readonly agreementTemplateCode: string;
  readonly agreementTemplateName: string;
  readonly billingMethod: BillingMethod;
  readonly billingDescription: string;
  readonly allowedPricingModels: readonly ConsultingPricingModel[];
  readonly initialStatus: string;
  readonly workflow: readonly EngagementWorkflowStep[];
  readonly transitions: readonly EngagementWorkflowTransition[];
  readonly policyNotes: readonly string[];
}

function step(code: string, label: string, terminal = false): EngagementWorkflowStep {
  return { code, label, terminal };
}

function transition(from: string, to: string): EngagementWorkflowTransition {
  return { from, to };
}

export const CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1 = [
  {
    policyVersion: ENGAGEMENT_TYPE_POLICY_VERSION,
    operatingGroupCode: "CONSULTING",
    code: "STRATEGY_SESSION",
    name: "Strategy Session",
    proposalRequired: false,
    directEngagementPermitted: true,
    agreementTemplateCode: "strategy-session-terms",
    agreementTemplateName: "Strategy Session Terms",
    billingMethod: "ONE_TIME_PREPAID",
    billingDescription: "One-time charge, normally collected before the session.",
    allowedPricingModels: ["PROJECT"],
    initialStatus: "DIRECT_CREATED",
    workflow: [
      step("DIRECT_CREATED", "Direct booking or internal creation"),
      step("TERMS_ACCEPTED", "Terms accepted"),
      step("PAYMENT_PENDING_OR_PAID", "Payment due or paid"),
      step("SCHEDULED", "Scheduled"),
      step("COMPLETED", "Completed", true),
      step("CANCELLED", "Cancelled", true)
    ],
    transitions: [
      transition("DIRECT_CREATED", "TERMS_ACCEPTED"),
      transition("TERMS_ACCEPTED", "PAYMENT_PENDING_OR_PAID"),
      transition("PAYMENT_PENDING_OR_PAID", "SCHEDULED"),
      transition("SCHEDULED", "COMPLETED"),
      transition("SCHEDULED", "CANCELLED")
    ],
    policyNotes: [
      "May also appear in a Proposal when bundled with other services.",
      "Fixed maps to the PROJECT Pricing Model for Version 1."
    ]
  },
  {
    policyVersion: ENGAGEMENT_TYPE_POLICY_VERSION,
    operatingGroupCode: "CONSULTING",
    code: "ADVISORY",
    name: "Advisory",
    proposalRequired: false,
    directEngagementPermitted: true,
    agreementTemplateCode: "advisory-services-agreement",
    agreementTemplateName: "Advisory Services Agreement",
    billingMethod: "TIME_BASED_30_MINUTE",
    billingDescription: "Time-based invoicing in 30-minute increments.",
    allowedPricingModels: ["ADVISORY_HOURLY"],
    initialStatus: "DIRECT_CREATED",
    workflow: [
      step("DIRECT_CREATED", "Direct Engagement created"),
      step("AGREEMENT_ACCEPTED", "Agreement accepted"),
      step("ACTIVE", "Active"),
      step("TIME_RECORDED", "Time recorded"),
      step("INVOICED", "Invoiced"),
      step("COMPLETED", "Completed", true),
      step("TERMINATED", "Terminated", true)
    ],
    transitions: [
      transition("DIRECT_CREATED", "AGREEMENT_ACCEPTED"),
      transition("AGREEMENT_ACCEPTED", "ACTIVE"),
      transition("ACTIVE", "TIME_RECORDED"),
      transition("TIME_RECORDED", "INVOICED"),
      transition("INVOICED", "COMPLETED"),
      transition("INVOICED", "TERMINATED")
    ],
    policyNotes: [
      "Advice-only; project execution is excluded.",
      "Recurring Advisory-level service is a RETAINER Engagement Type."
    ]
  },
  {
    policyVersion: ENGAGEMENT_TYPE_POLICY_VERSION,
    operatingGroupCode: "CONSULTING",
    code: "DIAGNOSTIC",
    name: "Diagnostic",
    proposalRequired: false,
    directEngagementPermitted: true,
    agreementTemplateCode: "diagnostic-services-agreement",
    agreementTemplateName: "Diagnostic Services Agreement",
    billingMethod: "ONE_TIME_PREPAID",
    billingDescription: "One-time fixed charge, normally due before work begins.",
    allowedPricingModels: ["PROJECT"],
    initialStatus: "DIRECT_CREATED",
    workflow: [
      step("DIRECT_CREATED", "Direct Engagement created"),
      step("AGREEMENT_ACCEPTED", "Agreement accepted"),
      step("PAYMENT_PENDING_OR_PAID", "Payment due or paid"),
      step("SCHEDULED", "Scheduled"),
      step("IN_PROGRESS", "In Progress"),
      step("DELIVERABLE_ISSUED", "Deliverable issued"),
      step("COMPLETED", "Completed", true),
      step("CANCELLED", "Cancelled", true)
    ],
    transitions: [
      transition("DIRECT_CREATED", "AGREEMENT_ACCEPTED"),
      transition("AGREEMENT_ACCEPTED", "PAYMENT_PENDING_OR_PAID"),
      transition("PAYMENT_PENDING_OR_PAID", "SCHEDULED"),
      transition("PAYMENT_PENDING_OR_PAID", "IN_PROGRESS"),
      transition("SCHEDULED", "IN_PROGRESS"),
      transition("SCHEDULED", "DELIVERABLE_ISSUED"),
      transition("IN_PROGRESS", "DELIVERABLE_ISSUED"),
      transition("DELIVERABLE_ISSUED", "COMPLETED"),
      transition("DELIVERABLE_ISSUED", "CANCELLED")
    ],
    policyNotes: [
      "May also appear in a Proposal when bundled with other services.",
      "Fixed maps to the PROJECT Pricing Model for Version 1."
    ]
  },
  {
    policyVersion: ENGAGEMENT_TYPE_POLICY_VERSION,
    operatingGroupCode: "CONSULTING",
    code: "PROJECT",
    name: "Project",
    proposalRequired: true,
    directEngagementPermitted: false,
    agreementTemplateCode: "project-services-agreement",
    agreementTemplateName: "Project Services Agreement",
    billingMethod: "PRICING_PROJECT_PAYMENT_SCHEDULE",
    billingDescription:
      "Determined by the approved Pricing Project, Proposal, and payment schedule.",
    allowedPricingModels: ["PROJECT", "PROFIT_SHARE_RETAINER", "HYBRID_RETAINER"],
    initialStatus: "PRICING_PROJECT",
    workflow: [
      step("PRICING_PROJECT", "Pricing Project"),
      step("PROPOSAL_DRAFT", "Proposal Draft"),
      step("PROPOSAL_SENT", "Proposal Sent"),
      step("CLIENT_ACCEPTED", "Client Accepted"),
      step("AGREEMENT_PENDING", "Agreement Pending"),
      step("AGREEMENT_EXECUTED", "Agreement Executed"),
      step("ACTIVE", "Engagement Active"),
      step("COMPLETED", "Completed", true),
      step("TERMINATED", "Terminated", true)
    ],
    transitions: [
      transition("PRICING_PROJECT", "PROPOSAL_DRAFT"),
      transition("PROPOSAL_DRAFT", "PROPOSAL_SENT"),
      transition("PROPOSAL_SENT", "CLIENT_ACCEPTED"),
      transition("CLIENT_ACCEPTED", "AGREEMENT_PENDING"),
      transition("AGREEMENT_PENDING", "AGREEMENT_EXECUTED"),
      transition("AGREEMENT_EXECUTED", "ACTIVE"),
      transition("ACTIVE", "COMPLETED"),
      transition("ACTIVE", "TERMINATED")
    ],
    policyNotes: ["Proposal acceptance is not inherited by a replacement Proposal."]
  },
  {
    policyVersion: ENGAGEMENT_TYPE_POLICY_VERSION,
    operatingGroupCode: "CONSULTING",
    code: "RETAINER",
    name: "Retainer",
    proposalRequired: true,
    directEngagementPermitted: false,
    agreementTemplateCode: "retainer-services-agreement",
    agreementTemplateName: "Retainer Services Agreement",
    billingMethod: "RECURRING_MONTHLY",
    billingDescription: "Recurring monthly billing according to approved Retainer terms.",
    allowedPricingModels: ["FIXED_RETAINER", "PROFIT_SHARE_RETAINER", "HYBRID_RETAINER"],
    initialStatus: "PRICING_PROJECT",
    workflow: [
      step("PRICING_PROJECT", "Pricing Project"),
      step("PROPOSAL_DRAFT", "Proposal Draft"),
      step("PROPOSAL_SENT", "Proposal Sent"),
      step("CLIENT_ACCEPTED", "Client Accepted"),
      step("AGREEMENT_PENDING", "Agreement Pending"),
      step("AGREEMENT_EXECUTED", "Agreement Executed"),
      step("ACTIVE", "Engagement Active"),
      step("RENEWED", "Renewed"),
      step("COMPLETED", "Completed", true),
      step("TERMINATED", "Terminated", true)
    ],
    transitions: [
      transition("PRICING_PROJECT", "PROPOSAL_DRAFT"),
      transition("PROPOSAL_DRAFT", "PROPOSAL_SENT"),
      transition("PROPOSAL_SENT", "CLIENT_ACCEPTED"),
      transition("CLIENT_ACCEPTED", "AGREEMENT_PENDING"),
      transition("AGREEMENT_PENDING", "AGREEMENT_EXECUTED"),
      transition("AGREEMENT_EXECUTED", "ACTIVE"),
      transition("ACTIVE", "RENEWED"),
      transition("RENEWED", "ACTIVE"),
      transition("ACTIVE", "COMPLETED"),
      transition("ACTIVE", "TERMINATED")
    ],
    policyNotes: [
      "Early termination governance retains reason, effective date, applicable exit fee, final invoice, outstanding obligations, documents, history, and remaining balances."
    ]
  }
] as const satisfies readonly EngagementTypePolicyV1[];

export function engagementTypePolicy(code: ConsultingEngagementTypeCode): EngagementTypePolicyV1 {
  return CONSULTING_ENGAGEMENT_TYPE_POLICIES_V1.find((policy) => policy.code === code)!;
}

export function isDirectEngagementPermitted(code: ConsultingEngagementTypeCode) {
  const policy = engagementTypePolicy(code);
  return !policy.proposalRequired && policy.directEngagementPermitted;
}
