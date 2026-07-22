import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "./proposal-application-errors";
import {
  PROPOSAL_CAPABILITIES,
  type ProposalActorContextProvider,
  type ProposalCapabilityEvaluator
} from "./proposal-capabilities";
import {
  deterministicRepresentationId,
  type ProposalRepresentationType
} from "./proposal-representation";
import type { RepresentationRenderer } from "./proposal-representation-renderer";
import type { ProposalRepresentationRepository } from "./proposal-representation-repository";

export class ProposalRepresentationService {
  constructor(
    private readonly actors: ProposalActorContextProvider,
    private readonly capabilities: ProposalCapabilityEvaluator,
    private readonly repository: ProposalRepresentationRepository,
    private readonly renderer: RepresentationRenderer
  ) {}

  async generate(
    identity: AuthenticatedIdentity,
    companyId: string,
    input: {
      readonly proposalId: string;
      readonly proposalVersionId: string;
      readonly representationType: ProposalRepresentationType;
      readonly generatedAt: string;
    }
  ) {
    const actor = await this.requireActor(identity, companyId);
    const capabilities = await this.capabilities.capabilitiesFor(actor);
    if (!capabilities.has(PROPOSAL_CAPABILITIES.GENERATE_REPRESENTATION)) {
      throw new ProposalApplicationError("CAPABILITY_DENIED", "Proposal representation generation is not permitted.");
    }
    const source = await this.repository.findVersionSource(companyId, input.proposalId, input.proposalVersionId);
    if (!source) throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal Version was not found.");
    const generated = this.renderer.render(source, input.representationType);
    return this.repository.insertOrGet({
      id: deterministicRepresentationId(input.proposalVersionId, input.representationType),
      companyId,
      proposalId: input.proposalId,
      proposalVersionId: input.proposalVersionId,
      representationType: input.representationType,
      representationVersion: 1,
      rendererVersion: generated.rendererVersion,
      representationStatus: "GENERATED",
      contentChecksum: generated.contentChecksum,
      contentType: generated.contentType,
      generatedContent: generated.content,
      metadata: generated.metadata,
      generatedAt: input.generatedAt,
      generatedByUserId: actor.userId
    });
  }

  private async requireActor(identity: AuthenticatedIdentity, companyId: string) {
    const actor = await this.actors.load(identity);
    if (!actor || !actor.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "An active authenticated Application User is required.");
    if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "The authenticated actor does not belong to the requested Company.");
    return actor;
  }
}
