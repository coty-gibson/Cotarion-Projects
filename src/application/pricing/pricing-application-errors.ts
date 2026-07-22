export type PricingApplicationErrorCode =
  | "NOT_AUTHENTICATED"
  | "PRICING_PROJECT_NOT_FOUND"
  | "COMPANY_SCOPE_VIOLATION"
  | "CAPABILITY_DENIED"
  | "INVALID_REQUEST"
  | "DOMAIN_RULE_VIOLATION"
  | "OPTIMISTIC_CONCURRENCY_CONFLICT"
  | "TRANSACTION_FAILURE";

export class PricingApplicationError extends Error {
  constructor(
    readonly code: PricingApplicationErrorCode,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "PricingApplicationError";
  }
}
