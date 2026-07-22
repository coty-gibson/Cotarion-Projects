export type ProposalDeliveryStatus = "REQUESTED" | "AVAILABLE" | "FAILED" | "REVOKED" | "EXPIRED";
export type ProposalDeliveryChannel = "SECURE_LINK";

export interface ProposalDeliveryRecipientSnapshot {
  readonly name: string;
  readonly email: string;
  readonly recipientRole: string | null;
}

export interface ProposalDeliveryState {
  readonly id: string; readonly companyId: string; readonly proposalId: string;
  readonly proposalVersionId: string; readonly proposalRepresentationId: string;
  readonly representationType: "HTML" | "PDF"; readonly deliveryChannel: ProposalDeliveryChannel;
  readonly recipients: readonly ProposalDeliveryRecipientSnapshot[];
  readonly status: ProposalDeliveryStatus; readonly requestedAt: string; readonly requestedByUserId: string;
  readonly sentAt: string | null; readonly failedAt: string | null; readonly failureCode: string | null;
  readonly failureMessage: string | null; readonly externalProviderReference: string | null;
  readonly correlationId: string; readonly deliveryAttemptNumber: number; readonly expiresAt: string;
  readonly revokedAt: string | null; readonly createdAt: string; readonly updatedAt: string;
}

export class ProposalDeliveryDomainError extends Error {}

export class ProposalDelivery {
  private constructor(private stateValue: ProposalDeliveryState) {}
  static rehydrate(state: ProposalDeliveryState) { return new ProposalDelivery(structuredClone(state)); }
  get state() { return structuredClone(this.stateValue); }
  revoke(occurredAt: string) {
    if (this.stateValue.status !== "AVAILABLE") throw new ProposalDeliveryDomainError("Only an available Delivery can be revoked.");
    this.stateValue = { ...this.stateValue, status: "REVOKED", revokedAt: occurredAt, updatedAt: occurredAt };
  }
  expire(occurredAt: string) {
    if (this.stateValue.status !== "AVAILABLE") throw new ProposalDeliveryDomainError("Only an available Delivery can expire.");
    if (Date.parse(occurredAt) < Date.parse(this.stateValue.expiresAt)) throw new ProposalDeliveryDomainError("Delivery has not reached expiration.");
    this.stateValue = { ...this.stateValue, status: "EXPIRED", updatedAt: occurredAt };
  }
  permitsAccess(at: string) { return this.stateValue.status === "AVAILABLE" && Date.parse(at) < Date.parse(this.stateValue.expiresAt); }
}
