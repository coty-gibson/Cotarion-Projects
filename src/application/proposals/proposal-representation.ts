import { createHash } from "node:crypto";
import type { JsonObject, ProposalPricingSnapshot } from "@/domain/proposals/contracts";
import type { ProposalWorkingDraft } from "@/domain/proposals/proposal-domain";

export const PROPOSAL_REPRESENTATION_RENDERER_VERSION = "proposal-representation/1";
export type ProposalRepresentationType = "HTML" | "PDF";
export type ProposalRepresentationStatus = "GENERATED";

export interface ProposalVersionRepresentationSource {
  readonly companyId: string;
  readonly proposalId: string;
  readonly proposalNumber: string;
  readonly proposalVersionId: string;
  readonly proposalVersionNumber: number;
  readonly draft: ProposalWorkingDraft;
  readonly pricingSnapshot: ProposalPricingSnapshot;
}

export interface GeneratedProposalRepresentation {
  readonly representationType: ProposalRepresentationType;
  readonly rendererVersion: string;
  readonly contentType: "text/html; charset=utf-8" | "application/pdf";
  readonly content: Uint8Array;
  readonly contentChecksum: string;
  readonly metadata: JsonObject;
}

export function deterministicRepresentationId(
  proposalVersionId: string,
  representationType: ProposalRepresentationType,
  representationVersion = 1
) {
  return `proposal-representation-${createHash("sha256").update(`${proposalVersionId}:${representationType}:${representationVersion}`).digest("hex").slice(0, 32)}`;
}
