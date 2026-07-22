import { isValidMajorRecordNumber } from "@/domain/proposals/contracts";

export class ProposalValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalValueError";
  }
}

export class ProposalNumber {
  private constructor(readonly value: string) {}

  static create(value: string) {
    const normalized = value.trim();
    if (!isValidMajorRecordNumber("PROPOSAL", normalized)) {
      throw new ProposalValueError("Proposal number must use the permanent PRO-###### format.");
    }
    return new ProposalNumber(normalized);
  }

  equals(other: ProposalNumber) {
    return this.value === other.value;
  }

  toString() {
    return this.value;
  }
}

export class ProposalTitle {
  private constructor(readonly value: string) {}

  static create(value: string) {
    const normalized = value.trim();
    if (!normalized) throw new ProposalValueError("Proposal title is required.");
    return new ProposalTitle(normalized);
  }

  equals(other: ProposalTitle) {
    return this.value === other.value;
  }

  toString() {
    return this.value;
  }
}

export type ProposalVersionStatus = "SAVED" | "SUBMITTED";

export class ProposalVersionNumber {
  private constructor(readonly value: number) {}

  static create(value: number) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new ProposalValueError("Proposal Version number must be a positive integer.");
    }
    return new ProposalVersionNumber(value);
  }

  next() {
    return ProposalVersionNumber.create(this.value + 1);
  }

  toString() {
    return String(this.value);
  }
}
