import { PricingGovernanceError } from "@/domain/pricing/pricing-governance-errors";

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new PricingGovernanceError("IDENTIFIER_REQUIRED", `${label} is required.`);
  }
  return normalized;
}

export class PricingIdentity {
  private constructor(readonly value: string) {}

  static create(value: string, label = "Pricing identity") {
    return new PricingIdentity(required(value, label));
  }

  equals(other: PricingIdentity) {
    return this.value === other.value;
  }

  toString() {
    return this.value;
  }
}

export class PricingVersionNumber {
  private constructor(readonly value: number) {}

  static create(value: number) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new PricingGovernanceError(
        "VERSION_NUMBER_INVALID",
        "Pricing Version number must be a positive safe integer."
      );
    }
    return new PricingVersionNumber(value);
  }

  next() {
    return PricingVersionNumber.create(this.value + 1);
  }

  equals(other: PricingVersionNumber) {
    return this.value === other.value;
  }
}

export class DraftCurrency {
  private constructor(readonly revision: number) {}

  static initial() {
    return new DraftCurrency(1);
  }

  static create(revision: number) {
    if (!Number.isSafeInteger(revision) || revision < 1) {
      throw new PricingGovernanceError(
        "DRAFT_CURRENCY_INVALID",
        "Draft currency must be a positive safe integer."
      );
    }
    return new DraftCurrency(revision);
  }

  advance() {
    return DraftCurrency.create(this.revision + 1);
  }

  equals(other: DraftCurrency) {
    return this.revision === other.revision;
  }
}

export class ReviewFinding {
  private constructor(readonly value: string) {}

  static create(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new PricingGovernanceError(
        "REVIEW_FINDING_REQUIRED",
        "A Quality Review rejection requires actionable findings."
      );
    }
    return new ReviewFinding(normalized);
  }
}

export interface ReviewCandidate {
  readonly versionId: PricingIdentity;
  readonly versionNumber: PricingVersionNumber;
  readonly requestedBy: PricingIdentity;
  readonly requestedAt: string;
}

export interface ApprovedVersion {
  readonly versionId: PricingIdentity;
  readonly versionNumber: PricingVersionNumber;
  readonly approvedBy: PricingIdentity;
  readonly approvedAt: string;
}

export type ReviewDecision =
  | {
      readonly outcome: "APPROVED";
      readonly versionId: PricingIdentity;
      readonly versionNumber: PricingVersionNumber;
      readonly decidedBy: PricingIdentity;
      readonly decidedAt: string;
    }
  | {
      readonly outcome: "REJECTED";
      readonly versionId: PricingIdentity;
      readonly versionNumber: PricingVersionNumber;
      readonly decidedBy: PricingIdentity;
      readonly decidedAt: string;
      readonly finding: ReviewFinding;
    };

export function pricingTimestamp(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new PricingGovernanceError(
      "TIMESTAMP_INVALID",
      "Pricing command timestamp must be a valid ISO timestamp."
    );
  }
  return new Date(value).toISOString();
}
