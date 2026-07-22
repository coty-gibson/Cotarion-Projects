import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "./proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalActorContextProvider, type ProposalCapabilityEvaluator } from "./proposal-capabilities";
import type { ProposalClientDecisionRepository } from "./proposal-client-decision-repository";

export class ProposalClientDecisionQueryService {
  constructor(private readonly actors: ProposalActorContextProvider, private readonly capabilities: ProposalCapabilityEvaluator, private readonly repository: ProposalClientDecisionRepository) {}
  async history(identity: AuthenticatedIdentity, companyId: string, proposalId: string) { await this.authorize(identity, companyId); return this.repository.list(companyId, proposalId); }
  async current(identity: AuthenticatedIdentity, companyId: string, proposalId: string) { await this.authorize(identity, companyId); return this.repository.current(companyId, proposalId); }
  async deliveryStatus(identity: AuthenticatedIdentity, companyId: string, proposalId: string, deliveryId: string) { await this.authorize(identity, companyId); return this.repository.byDelivery(companyId, proposalId, deliveryId); }
  async timeline(identity: AuthenticatedIdentity, companyId: string, proposalId: string) { return (await this.history(identity, companyId, proposalId)).flatMap(({ timeline }) => timeline); }
  private async authorize(identity: AuthenticatedIdentity, companyId: string) { const actor = await this.actors.load(identity); if (!actor?.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication is required."); if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "Company scope is invalid."); if (!(await this.capabilities.capabilitiesFor(actor)).has(PROPOSAL_CAPABILITIES.VIEW_DECISIONS)) throw new ProposalApplicationError("CAPABILITY_DENIED", "Proposal Decision viewing is not permitted."); }
}
