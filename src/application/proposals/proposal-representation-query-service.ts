import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "./proposal-application-errors";
import type { ProposalActorContextProvider } from "./proposal-capabilities";
import type { ProposalRepresentationType } from "./proposal-representation";
import type { ProposalRepresentationRecord, ProposalRepresentationRepository } from "./proposal-representation-repository";

function project(record: ProposalRepresentationRecord) {
  return {
    id: record.id,
    proposalId: record.proposalId,
    proposalVersionId: record.proposalVersionId,
    proposalVersionNumber: record.proposalVersionNumber,
    representationType: record.representationType,
    representationVersion: record.representationVersion,
    rendererVersion: record.rendererVersion,
    status: record.representationStatus,
    contentChecksum: record.contentChecksum,
    contentType: record.contentType,
    generatedAt: record.generatedAt,
    generatedByUserId: record.generatedByUserId,
    metadata: record.metadata
  };
}

export class ProposalRepresentationQueryService {
  constructor(private readonly actors: ProposalActorContextProvider, private readonly repository: ProposalRepresentationRepository) {}

  async list(identity: AuthenticatedIdentity, companyId: string, proposalId: string, proposalVersionId?: string) {
    await this.requireActor(identity, companyId);
    return (await this.repository.list(companyId, proposalId, proposalVersionId)).map(project);
  }

  async detail(identity: AuthenticatedIdentity, companyId: string, proposalId: string, representationId: string) {
    await this.requireActor(identity, companyId);
    const record = await this.repository.detail(companyId, proposalId, representationId);
    if (!record) throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal Representation was not found.");
    return project(record);
  }

  async current(identity: AuthenticatedIdentity, companyId: string, proposalId: string, type: ProposalRepresentationType) {
    await this.requireActor(identity, companyId);
    const record = await this.repository.current(companyId, proposalId, type);
    return record ? project(record) : null;
  }

  async history(identity: AuthenticatedIdentity, companyId: string, proposalId: string) {
    return this.list(identity, companyId, proposalId);
  }

  async content(identity: AuthenticatedIdentity, companyId: string, proposalId: string, representationId: string) {
    await this.requireActor(identity, companyId);
    const record = await this.repository.detail(companyId, proposalId, representationId);
    if (!record) throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal Representation was not found.");
    return { content: record.generatedContent, contentType: record.contentType, type: record.representationType };
  }

  private async requireActor(identity: AuthenticatedIdentity, companyId: string) {
    const actor = await this.actors.load(identity);
    if (!actor || !actor.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "An active authenticated Application User is required.");
    if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "The authenticated actor does not belong to the requested Company.");
  }
}
