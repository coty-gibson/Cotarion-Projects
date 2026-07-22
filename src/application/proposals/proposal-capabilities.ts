import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";

export const PROPOSAL_CAPABILITIES = {
  CREATE: "proposal:create",
  EDIT_DRAFT: "proposal:edit-draft",
  SAVE_VERSION: "proposal:save-version",
  REQUEST_REVIEW: "proposal:request-quality-review",
  QUALITY_REVIEW: "proposal:quality-review",
  EXECUTIVE_AUTHORIZE: "proposal:executive-authorize",
  RECORD_CLIENT_ACTIVITY: "proposal:record-client-activity",
  MANAGE_ACCEPTANCE: "proposal:manage-acceptance",
  LINK_AGREEMENT: "proposal:link-agreement",
  MANAGE_LIFECYCLE: "proposal:manage-lifecycle",
  CREATE_REPLACEMENT: "proposal:create-replacement",
  SUPERSEDE: "proposal:supersede",
  ARCHIVE: "proposal:archive",
  GENERATE_REPRESENTATION: "proposal:generate-representation",
  CREATE_DELIVERY: "proposal:create-delivery",
  VIEW_DELIVERY: "proposal:view-delivery",
  REVOKE_DELIVERY: "proposal:revoke-delivery",
  VIEW_DECISIONS: "proposal:view-decisions",
  GENERATE_AGREEMENT: "agreement:generate",
  VIEW_AGREEMENT: "agreement:view",
  CREATE_SIGNATURE_REQUEST: "agreement:create-signature-request",
  VIEW_SIGNATURES: "agreement:view-signatures",
  REVOKE_SIGNATURE_REQUEST: "agreement:revoke-signature-request",
  EXECUTE_AGREEMENT: "agreement:execute",
  VIEW_EXECUTION: "agreement:view-execution"
} as const;

export type ProposalCapability =
  (typeof PROPOSAL_CAPABILITIES)[keyof typeof PROPOSAL_CAPABILITIES];

export interface ProposalActorContext {
  readonly userId: string;
  readonly companyId: string;
  readonly active: boolean;
}

export interface ProposalActorContextProvider {
  load(identity: AuthenticatedIdentity): Promise<ProposalActorContext | null>;
}

export interface ProposalCapabilityEvaluator {
  capabilitiesFor(actor: ProposalActorContext): Promise<ReadonlySet<ProposalCapability>>;
}

export type ProposalAuthorityRole = "MEMBER" | "ADMIN" | "FOUNDER";

export interface ProposalAuthorityProvider {
  roleFor(actor: ProposalActorContext): Promise<ProposalAuthorityRole>;
  additionalCapabilitiesFor?(
    actor: ProposalActorContext
  ): Promise<ReadonlySet<ProposalCapability>>;
}

const MEMBER_DEFAULT_CAPABILITIES: readonly ProposalCapability[] = [
  PROPOSAL_CAPABILITIES.CREATE,
  PROPOSAL_CAPABILITIES.EDIT_DRAFT,
  PROPOSAL_CAPABILITIES.SAVE_VERSION,
  PROPOSAL_CAPABILITIES.REQUEST_REVIEW,
  PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY,
  PROPOSAL_CAPABILITIES.MANAGE_ACCEPTANCE,
  PROPOSAL_CAPABILITIES.LINK_AGREEMENT,
  PROPOSAL_CAPABILITIES.MANAGE_LIFECYCLE,
  PROPOSAL_CAPABILITIES.CREATE_REPLACEMENT,
  PROPOSAL_CAPABILITIES.SUPERSEDE,
  PROPOSAL_CAPABILITIES.ARCHIVE,
  PROPOSAL_CAPABILITIES.GENERATE_REPRESENTATION,
  PROPOSAL_CAPABILITIES.CREATE_DELIVERY,
  PROPOSAL_CAPABILITIES.VIEW_DELIVERY,
  PROPOSAL_CAPABILITIES.REVOKE_DELIVERY,
  PROPOSAL_CAPABILITIES.VIEW_DECISIONS,
  PROPOSAL_CAPABILITIES.GENERATE_AGREEMENT,
  PROPOSAL_CAPABILITIES.VIEW_AGREEMENT,
  PROPOSAL_CAPABILITIES.CREATE_SIGNATURE_REQUEST,
  PROPOSAL_CAPABILITIES.VIEW_SIGNATURES,
  PROPOSAL_CAPABILITIES.REVOKE_SIGNATURE_REQUEST,
  PROPOSAL_CAPABILITIES.EXECUTE_AGREEMENT,
  PROPOSAL_CAPABILITIES.VIEW_EXECUTION
];

export class DefaultProposalCapabilityEvaluator implements ProposalCapabilityEvaluator {
  constructor(private readonly authority: ProposalAuthorityProvider) {}

  async capabilitiesFor(actor: ProposalActorContext) {
    const role = await this.authority.roleFor(actor);
    const capabilities = new Set<ProposalCapability>(MEMBER_DEFAULT_CAPABILITIES);
    if (role === "ADMIN" || role === "FOUNDER") {
      capabilities.add(PROPOSAL_CAPABILITIES.QUALITY_REVIEW);
      capabilities.add(PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE);
    }
    for (const capability of
      (await this.authority.additionalCapabilitiesFor?.(actor)) ?? []) {
      capabilities.add(capability);
    }
    return capabilities;
  }
}
