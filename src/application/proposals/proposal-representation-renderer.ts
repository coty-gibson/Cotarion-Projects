import type {
  GeneratedProposalRepresentation,
  ProposalRepresentationType,
  ProposalVersionRepresentationSource
} from "./proposal-representation";

export interface RepresentationRenderer {
  render(
    source: ProposalVersionRepresentationSource,
    representationType: ProposalRepresentationType
  ): GeneratedProposalRepresentation;
}
