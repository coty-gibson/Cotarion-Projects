import type { ProposalAuthorityRole } from "@/application/proposals/proposal-capabilities";

export type AuthorityAdministrationMethod =
  | "NEW_COMPANY_BOOTSTRAP"
  | "VOLUNTARY_TRANSFER"
  | "ADMIN_ASSIGNMENT"
  | "ADMIN_REVOCATION"
  | "ADMIN_RELINQUISHMENT"
  | "RECOVERY";

export interface AuthorityCommandEvidence {
  readonly auditId: string;
  readonly actorIdentity: string;
  readonly actorUserId?: string;
  readonly companyId: string;
  readonly affectedUserId: string;
  readonly businessJustification: string;
  readonly occurredAt: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface CompanyAuthorityRepository {
  effectiveRole(companyId: string, userId: string): Promise<ProposalAuthorityRole>;
  bootstrapNewCompanyFounder(evidence: AuthorityCommandEvidence): Promise<void>;
  recoverFounder(evidence: AuthorityCommandEvidence): Promise<void>;
  transferFounder(
    evidence: AuthorityCommandEvidence,
    options: { retainOutgoingAdmin: boolean }
  ): Promise<void>;
  assignAdmin(evidence: AuthorityCommandEvidence): Promise<void>;
  revokeAdmin(evidence: AuthorityCommandEvidence): Promise<void>;
  relinquishAdmin(evidence: AuthorityCommandEvidence): Promise<void>;
}

export class AuthorityConfigurationError extends Error {
  constructor(
    readonly code:
      | "ACTOR_NOT_FOUND"
      | "ACTOR_INACTIVE"
      | "COMPANY_SCOPE_VIOLATION"
      | "AUTHORITY_CONFIGURATION_MISSING"
      | "CONFLICTING_FOUNDER_SEAT"
      | "CAPABILITY_DENIED"
      | "INVALID_EVIDENCE",
    message: string
  ) {
    super(message);
    this.name = "AuthorityConfigurationError";
  }
}
