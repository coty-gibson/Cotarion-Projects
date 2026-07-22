export type ProposalApplicationErrorCode =
  | "NOT_AUTHENTICATED"
  | "PROPOSAL_NOT_FOUND"
  | "COMPANY_SCOPE_VIOLATION"
  | "CAPABILITY_DENIED"
  | "INVALID_REQUEST"
  | "DOMAIN_RULE_VIOLATION"
  | "OPTIMISTIC_CONCURRENCY_CONFLICT"
  | "IMMUTABLE_PERSISTENCE_CONFLICT"
  | "TRANSACTION_FAILURE"
  | "AUTHORITY_CONFIGURATION_MISSING"
  | "AUTHORITY_CONFLICT";

export class ProposalApplicationError extends Error {
  constructor(
    readonly code: ProposalApplicationErrorCode,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "ProposalApplicationError";
  }
}
