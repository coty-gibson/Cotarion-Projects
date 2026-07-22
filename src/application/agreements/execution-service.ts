import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalActorContextProvider, type ProposalCapabilityEvaluator } from "@/application/proposals/proposal-capabilities";
import type { AgreementExecutionRepository } from "./execution-repository";

export class AgreementExecutionService {
  constructor(private actors: ProposalActorContextProvider, private capabilities: ProposalCapabilityEvaluator, private repository: AgreementExecutionRepository, private nextId: () => string = () => crypto.randomUUID()) {}
  async execute(identity: AuthenticatedIdentity, companyId: string, input: { agreementId: string; executedAt: string; correlationId: string; requestIdentity: string }) {
    const actor = await this.actors.load(identity);
    if (!actor?.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication required.");
    if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "Company scope is invalid.");
    if (!(await this.capabilities.capabilitiesFor(actor)).has(PROPOSAL_CAPABILITIES.EXECUTE_AGREEMENT)) throw new ProposalApplicationError("CAPABILITY_DENIED", "agreement:execute is required.");
    try { return await this.repository.execute({ ...input, id: `agreement-execution-${this.nextId()}`, companyId, executedByUserId: actor.userId }); }
    catch (caught) { if (caught instanceof Error && /not eligible|conflict/i.test(caught.message)) throw new ProposalApplicationError("DOMAIN_RULE_VIOLATION", caught.message); throw caught; }
  }
}
