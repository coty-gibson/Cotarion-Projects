import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalActorContextProvider, type ProposalCapabilityEvaluator } from "@/application/proposals/proposal-capabilities";
import type { SignatureRepository } from "./signature-repository";

export class SignatureQueryService {
  constructor(private actors: ProposalActorContextProvider, private capabilities: ProposalCapabilityEvaluator, private repository: SignatureRepository) {}

  async list(identity: AuthenticatedIdentity, companyId: string, agreementId: string) {
    const capabilities = await this.auth(identity, companyId);
    const items = (await this.repository.list(companyId, agreementId)).map(item => ({
      ...item,
      permittedActions: { revoke: item.status === "AVAILABLE" && Date.parse(item.expiresAt) > Date.now() && capabilities.has(PROPOSAL_CAPABILITIES.REVOKE_SIGNATURE_REQUEST) },
    }));
    return { items, permittedActions: { create: items.length === 0 && capabilities.has(PROPOSAL_CAPABILITIES.CREATE_SIGNATURE_REQUEST) } };
  }

  async detail(identity: AuthenticatedIdentity, companyId: string, agreementId: string, id: string) {
    await this.auth(identity, companyId);
    const value = await this.repository.detail(companyId, agreementId, id);
    if (!value) throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Signature Request not found.");
    return value;
  }

  async progress(identity: AuthenticatedIdentity, companyId: string, agreementId: string) {
    const { items } = await this.list(identity, companyId, agreementId);
    return { agreementId, total: items.length, statuses: items.map(({ signer, status }) => ({ role: signer.role, order: signer.order, status })), fullySigned: items.length > 0 && items.every(({ status }) => status === "SIGNED"), agreementExecuted: false };
  }

  private async auth(identity: AuthenticatedIdentity, companyId: string) {
    const actor = await this.actors.load(identity);
    if (!actor?.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication required.");
    if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "Company scope invalid.");
    const capabilities = await this.capabilities.capabilitiesFor(actor);
    if (!capabilities.has(PROPOSAL_CAPABILITIES.VIEW_SIGNATURES)) throw new ProposalApplicationError("CAPABILITY_DENIED", "agreement:view-signatures is required.");
    return capabilities;
  }
}
