import type { ProposalClientDecisionEvidence, ProposalClientDecisionOutcome } from "@/domain/proposals/proposal-client-decision";

export interface ProposalDecisionReadRecord extends ProposalClientDecisionEvidence {
  readonly representationType: "HTML" | "PDF";
  readonly timeline: readonly { id: string; eventType: string; occurredAt: string; actorType: string; correlationId: string }[];
}
export type PublicDecisionResult =
  | { status: "RECORDED"; decision: ProposalDecisionReadRecord; title: string; proposalNumber: string; proposalVersionNumber: number }
  | { status: "REPLAY"; decision: ProposalDecisionReadRecord; title: string; proposalNumber: string; proposalVersionNumber: number }
  | { status: "UNAVAILABLE" }
  | { status: "CONFLICT" };
export interface ProposalClientDecisionRepository {
  recordFromSecureDelivery(input: { id: string; tokenDigest: string; outcome: "ACCEPTED" | "DECLINED"; decidedAt: string; clientDisplayName: string | null; clientMessage: string | null; correlationId: string; requestIdentity: string }): Promise<PublicDecisionResult>;
  publicStatus(tokenDigest: string, occurredAt: string): Promise<{ eligible: boolean; outcome: ProposalClientDecisionOutcome | null } | null>;
  list(companyId: string, proposalId: string): Promise<readonly ProposalDecisionReadRecord[]>;
  current(companyId: string, proposalId: string): Promise<ProposalDecisionReadRecord | null>;
  byDelivery(companyId: string, proposalId: string, deliveryId: string): Promise<ProposalDecisionReadRecord | null>;
}
