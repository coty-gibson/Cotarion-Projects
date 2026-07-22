export type ProposalClientDecisionOutcome = "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED";
export interface ProposalClientDecisionEvidence {
  readonly id: string; readonly companyId: string; readonly proposalId: string; readonly proposalVersionId: string;
  readonly proposalRepresentationId: string; readonly deliveryId: string; readonly outcome: ProposalClientDecisionOutcome;
  readonly decidedAt: string; readonly actorType: "SECURE_LINK_CLIENT"; readonly clientDisplayName: string | null;
  readonly clientMessage: string | null; readonly internalNotes: string | null; readonly correlationId: string;
  readonly requestIdentity: string; readonly createdAt: string;
}
export class ProposalClientDecision {
  private constructor(private readonly evidence: ProposalClientDecisionEvidence) {}
  static record(evidence: ProposalClientDecisionEvidence) {
    if (!evidence.deliveryId || !evidence.proposalVersionId || !evidence.proposalRepresentationId) throw new Error("Decision requires immutable Delivery evidence.");
    return new ProposalClientDecision(structuredClone(evidence));
  }
  static rehydrate(evidence: ProposalClientDecisionEvidence) { return new ProposalClientDecision(structuredClone(evidence)); }
  get state() { return structuredClone(this.evidence); }
}
