import { createHash } from "node:crypto";
import {
  PROPOSAL_REPRESENTATION_RENDERER_VERSION,
  type GeneratedProposalRepresentation,
  type ProposalRepresentationType,
  type ProposalVersionRepresentationSource
} from "@/application/proposals/proposal-representation";

export function completeRepresentation(
  source: ProposalVersionRepresentationSource,
  representationType: ProposalRepresentationType,
  contentType: GeneratedProposalRepresentation["contentType"],
  content: Uint8Array
): GeneratedProposalRepresentation {
  const pricingVersionId = "pricingVersionId" in source.pricingSnapshot
    ? source.pricingSnapshot.pricingVersionId
    : null;
  return {
    representationType,
    rendererVersion: PROPOSAL_REPRESENTATION_RENDERER_VERSION,
    contentType,
    content,
    contentChecksum: createHash("sha256").update(content).digest("hex"),
    metadata: {
      proposalNumber: source.proposalNumber,
      proposalVersionNumber: source.proposalVersionNumber,
      proposalVersionId: source.proposalVersionId,
      pricingVersionId,
      contentSchemaVersion: source.draft.content.schemaVersion
    }
  };
}
