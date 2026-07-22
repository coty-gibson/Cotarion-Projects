import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalActorContextProvider, type ProposalCapabilityEvaluator } from "@/application/proposals/proposal-capabilities";
import type { AgreementExecutionRepository } from "./execution-repository";

export class AgreementExecutionQueryService {
  constructor(private actors: ProposalActorContextProvider, private capabilities: ProposalCapabilityEvaluator, private repository: AgreementExecutionRepository) {}
  async detail(identity: AuthenticatedIdentity, companyId: string, agreementId: string) { const caps = await this.auth(identity, companyId); const execution = await this.repository.detail(companyId, agreementId); const eligibility = execution ? { eligible: false, reason: "ALREADY_EXECUTED" } : await this.repository.eligibility(companyId, agreementId); return { execution, permittedActions: { execute: !execution && eligibility.eligible && caps.has(PROPOSAL_CAPABILITIES.EXECUTE_AGREEMENT) }, determination: eligibility.reason }; }
  async list(identity: AuthenticatedIdentity, companyId: string, agreementId: string) { await this.auth(identity, companyId); return this.repository.list(companyId, agreementId); }
  async status(identity: AuthenticatedIdentity, companyId: string, agreementId: string) { const result = await this.detail(identity, companyId, agreementId); return { executed: Boolean(result.execution), executedAt: result.execution?.executedAt ?? null, executedBy: result.execution?.executedBy ?? null, signerSummary: result.execution?.signerSummary ?? [], permittedActions: result.permittedActions, determination: result.determination }; }
  private async auth(identity: AuthenticatedIdentity, companyId: string) { const actor = await this.actors.load(identity); if (!actor?.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "Authentication required."); if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "Company scope is invalid."); const caps = await this.capabilities.capabilitiesFor(actor); if (!caps.has(PROPOSAL_CAPABILITIES.VIEW_EXECUTION)) throw new ProposalApplicationError("CAPABILITY_DENIED", "agreement:view-execution is required."); return caps; }
}
