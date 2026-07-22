import type { ProposalActorContext, ProposalActorContextProvider, ProposalAuthorityProvider } from "@/application/proposals/proposal-capabilities";

export const PRICING_CAPABILITIES = {
  CREATE: "pricing:create",
  EDIT_DRAFT: "pricing:edit-draft",
  SAVE_VERSION: "pricing:save-version",
  REQUEST_REVIEW: "pricing:request-quality-review",
  QUALITY_REVIEW: "pricing:quality-review",
  BEGIN_REVISION: "pricing:begin-revision",
  ARCHIVE_DRAFT: "pricing:archive-draft",
  ARCHIVE_QUOTED: "pricing:archive-quoted"
} as const;

export type PricingCapability = (typeof PRICING_CAPABILITIES)[keyof typeof PRICING_CAPABILITIES];
export type PricingActorContext = ProposalActorContext;
export type PricingActorContextProvider = ProposalActorContextProvider;

export interface PricingCapabilityEvaluator {
  capabilitiesFor(actor: PricingActorContext): Promise<ReadonlySet<PricingCapability>>;
}

const MEMBER_DEFAULTS: readonly PricingCapability[] = [
  PRICING_CAPABILITIES.CREATE,
  PRICING_CAPABILITIES.EDIT_DRAFT,
  PRICING_CAPABILITIES.SAVE_VERSION,
  PRICING_CAPABILITIES.REQUEST_REVIEW,
  PRICING_CAPABILITIES.BEGIN_REVISION,
  PRICING_CAPABILITIES.ARCHIVE_DRAFT
];

export class DefaultPricingCapabilityEvaluator implements PricingCapabilityEvaluator {
  constructor(private readonly authority: ProposalAuthorityProvider) {}

  async capabilitiesFor(actor: PricingActorContext) {
    const role = await this.authority.roleFor(actor);
    const capabilities = new Set<PricingCapability>(MEMBER_DEFAULTS);
    if (role === "ADMIN" || role === "FOUNDER") {
      capabilities.add(PRICING_CAPABILITIES.QUALITY_REVIEW);
      capabilities.add(PRICING_CAPABILITIES.ARCHIVE_QUOTED);
    }
    return capabilities;
  }
}
