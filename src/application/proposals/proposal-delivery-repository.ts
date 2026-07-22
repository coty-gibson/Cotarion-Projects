import type { ProposalDeliveryRecipientSnapshot, ProposalDeliveryState } from "@/domain/proposals/proposal-delivery";

export interface CreateProposalDeliveryRecord {
  readonly id: string; readonly companyId: string; readonly proposalId: string;
  readonly proposalVersionId: string; readonly proposalRepresentationId: string;
  readonly representationType: "HTML" | "PDF"; readonly requestIdentity: string;
  readonly recipients: readonly ProposalDeliveryRecipientSnapshot[]; readonly requestedAt: string;
  readonly requestedByUserId: string; readonly correlationId: string; readonly tokenDigest: string;
  readonly expiresAt: string;
}

export interface ProposalDeliveryPublicArtifact {
  readonly title: string; readonly proposalNumber: string; readonly proposalVersionNumber: number;
  readonly representationType: "HTML" | "PDF"; readonly contentType: string;
  readonly content: Uint8Array; readonly expiresAt: string;
}

export interface ProposalDeliveryReadRecord extends ProposalDeliveryState {
  readonly events: readonly { id: string; eventType: string; occurredAt: string; actorUserId: string | null; correlationId: string }[];
  readonly accesses: readonly { id: string; accessedAt: string; accessType: string; correlationId: string }[];
}

export interface ProposalDeliveryRepository {
  representationSource(companyId: string, proposalId: string, representationId: string): Promise<{ proposalVersionId: string; representationType: "HTML" | "PDF" } | null>;
  createOrReplay(input: CreateProposalDeliveryRecord): Promise<{ delivery: ProposalDeliveryReadRecord; idempotentReplay: boolean }>;
  detail(companyId: string, proposalId: string, deliveryId: string): Promise<ProposalDeliveryReadRecord | null>;
  list(companyId: string, proposalId: string): Promise<readonly ProposalDeliveryReadRecord[]>;
  revoke(companyId: string, proposalId: string, deliveryId: string, occurredAt: string, actorUserId: string, correlationId: string): Promise<ProposalDeliveryReadRecord | null>;
  expire(companyId: string, proposalId: string, deliveryId: string, occurredAt: string, actorUserId: string, correlationId: string): Promise<ProposalDeliveryReadRecord | null>;
  resolveActiveAndRecordAccess(tokenDigest: string, occurredAt: string, correlationId: string): Promise<ProposalDeliveryPublicArtifact | null>;
}
