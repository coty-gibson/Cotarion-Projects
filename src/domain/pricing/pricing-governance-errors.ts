export type PricingGovernanceErrorCode =
  | "IDENTIFIER_REQUIRED"
  | "VERSION_NUMBER_INVALID"
  | "DRAFT_CURRENCY_INVALID"
  | "TIMESTAMP_INVALID"
  | "VERSION_EVIDENCE_INVALID"
  | "VERSION_ID_REUSED"
  | "EVENT_ID_REUSED"
  | "REVIEW_FINDING_REQUIRED"
  | "OPTIMISTIC_CONCURRENCY_CONFLICT"
  | "IDEMPOTENCY_KEY_REUSED"
  | "ILLEGAL_PRICING_TRANSITION"
  | "PRICING_VERSION_NOT_FOUND"
  | "PRICING_VERSION_STALE"
  | "REVIEW_CANDIDATE_REQUIRED"
  | "REVIEWER_NOT_INDEPENDENT"
  | "APPROVED_VERSION_REQUIRED";

export class PricingGovernanceError extends Error {
  readonly name = "PricingGovernanceError";

  constructor(
    readonly code: PricingGovernanceErrorCode,
    message: string
  ) {
    super(message);
  }
}

export class PricingConcurrencyError extends PricingGovernanceError {
  constructor(expectedRevision: number, actualRevision: number) {
    super(
      "OPTIMISTIC_CONCURRENCY_CONFLICT",
      `Expected Pricing Project revision ${expectedRevision}, but the current revision is ${actualRevision}.`
    );
  }
}

export class PricingTransitionError extends PricingGovernanceError {
  constructor(action: string, status: string) {
    super(
      "ILLEGAL_PRICING_TRANSITION",
      `${action} is not permitted while the Pricing Project is ${status}.`
    );
  }
}
