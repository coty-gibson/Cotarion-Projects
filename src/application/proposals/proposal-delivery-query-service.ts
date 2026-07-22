import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "./proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalActorContextProvider, type ProposalCapabilityEvaluator } from "./proposal-capabilities";
import type { ProposalDeliveryReadRecord, ProposalDeliveryRepository } from "./proposal-delivery-repository";

function project(record: ProposalDeliveryReadRecord) {
  return { ...record, permittedActions: { revoke: record.status === "AVAILABLE" && Date.parse(record.expiresAt) > Date.now() } };
}

export class ProposalDeliveryQueryService {
  constructor(private readonly actors: ProposalActorContextProvider, private readonly capabilities: ProposalCapabilityEvaluator, private readonly repository: ProposalDeliveryRepository) {}
  async list(identity: AuthenticatedIdentity, companyId: string, proposalId: string) { const capabilities = await this.authorize(identity, companyId); return (await this.repository.list(companyId, proposalId)).map((record) => ({ ...project(record), permittedActions: { revoke: project(record).permittedActions.revoke && capabilities.has(PROPOSAL_CAPABILITIES.REVOKE_DELIVERY) } })); }
  async detail(identity: AuthenticatedIdentity, companyId: string, proposalId: string, deliveryId: string) { const capabilities = await this.authorize(identity, companyId); const record = await this.repository.detail(companyId, proposalId, deliveryId); if (!record) throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal Delivery was not found."); return { ...project(record), permittedActions: { revoke: project(record).permittedActions.revoke && capabilities.has(PROPOSAL_CAPABILITIES.REVOKE_DELIVERY) } }; }
  async history(identity: AuthenticatedIdentity, companyId: string, proposalId: string) { return this.list(identity, companyId, proposalId); }
  async activeLinks(identity: AuthenticatedIdentity, companyId: string, proposalId: string) { return (await this.list(identity, companyId, proposalId)).filter(({ status, expiresAt }) => status === "AVAILABLE" && Date.parse(expiresAt) > Date.now()); }
  async accessHistory(identity: AuthenticatedIdentity, companyId: string, proposalId: string, deliveryId: string) { return (await this.detail(identity, companyId, proposalId, deliveryId)).accesses; }
  private async authorize(identity: AuthenticatedIdentity, companyId: string) { const actor = await this.actors.load(identity); if (!actor || !actor.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication is required."); if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "Company scope is invalid."); const capabilities = await this.capabilities.capabilitiesFor(actor); if (!capabilities.has(PROPOSAL_CAPABILITIES.VIEW_DELIVERY)) throw new ProposalApplicationError("CAPABILITY_DENIED", "Proposal Delivery viewing is not permitted."); return capabilities; }
}
