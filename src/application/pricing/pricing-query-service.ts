import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import {
  PRICING_CAPABILITIES,
  type PricingActorContext,
  type PricingActorContextProvider,
  type PricingCapabilityEvaluator
} from "@/application/pricing/pricing-capabilities";
import { PricingApplicationError } from "@/application/pricing/pricing-application-errors";
import type {
  PricingPermittedAction,
  PricingProjectListQuery,
  PricingReadRepository
} from "@/application/pricing/pricing-read-models";
import { encodePricingConcurrencyToken } from "@/application/pricing/pricing-concurrency-token";
import { permittedPricingTransitions } from "@/domain/pricing/pricing-project";

export class PricingQueryService {
  constructor(
    private readonly actors: PricingActorContextProvider,
    private readonly capabilities: PricingCapabilityEvaluator,
    private readonly repository: PricingReadRepository
  ) {}

  async list(identity: AuthenticatedIdentity, companyId: string, query: PricingProjectListQuery) {
    await this.requireActor(identity, companyId);
    return this.repository.list(companyId, query);
  }

  async detail(identity: AuthenticatedIdentity, companyId: string, pricingProjectId: string) {
    const actor = await this.requireActor(identity, companyId);
    const [result, permittedActions] = await Promise.all([
      this.repository.detail(companyId, pricingProjectId),
      this.permittedActions(actor, companyId, pricingProjectId)
    ]);
    if (!result) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Pricing Project was not found.");
    return { ...result, permittedActions };
  }

  async versions(identity: AuthenticatedIdentity, companyId: string, pricingProjectId: string) {
    await this.requireActor(identity, companyId);
    const result = await this.repository.versions(companyId, pricingProjectId);
    if (!result) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Pricing Project was not found.");
    return result;
  }

  async reviews(identity: AuthenticatedIdentity, companyId: string, pricingProjectId: string) {
    await this.requireActor(identity, companyId);
    const result = await this.repository.reviews(companyId, pricingProjectId);
    if (!result) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Pricing Project was not found.");
    return result;
  }

  async editableDraft(identity: AuthenticatedIdentity, companyId: string, pricingProjectId: string) {
    const actor = await this.requireActor(identity, companyId);
    const [source, permittedActions] = await Promise.all([
      this.repository.editableDraft(companyId, pricingProjectId),
      this.permittedActions(actor, companyId, pricingProjectId)
    ]);
    if (!source) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Pricing Project was not found.");
    const { concurrencyVersion, ...editableDraft } = source;
    return {
      ...editableDraft,
      concurrencyToken: encodePricingConcurrencyToken(concurrencyVersion),
      permittedActions
    };
  }

  private async permittedActions(
    actor: PricingActorContext,
    companyId: string,
    pricingProjectId: string
  ): Promise<readonly PricingPermittedAction[]> {
    const [context, capabilities] = await Promise.all([
      this.repository.actionContext(companyId, pricingProjectId),
      this.capabilities.capabilitiesFor(actor)
    ]);
    if (!context) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Pricing Project was not found.");
    const transitions = new Set(permittedPricingTransitions(context, actor.userId));
    const actions: PricingPermittedAction[] = [];
    if (transitions.has("UPDATE_DRAFT") && capabilities.has(PRICING_CAPABILITIES.EDIT_DRAFT)) actions.push("EDIT_DRAFT");
    if (transitions.has("SAVE_VERSION") && capabilities.has(PRICING_CAPABILITIES.SAVE_VERSION)) actions.push("SAVE_VERSION");
    if (transitions.has("REQUEST_QUALITY_REVIEW") && capabilities.has(PRICING_CAPABILITIES.REQUEST_REVIEW)) actions.push("REQUEST_QUALITY_REVIEW");
    if (transitions.has("APPROVE_VERSION") && capabilities.has(PRICING_CAPABILITIES.QUALITY_REVIEW)) actions.push("APPROVE");
    if (transitions.has("REJECT_VERSION") && capabilities.has(PRICING_CAPABILITIES.QUALITY_REVIEW)) actions.push("REJECT");
    if (transitions.has("BEGIN_REVISION") && capabilities.has(PRICING_CAPABILITIES.BEGIN_REVISION)) actions.push("BEGIN_REVISION");
    const archiveCapability = context.status === "QUOTED"
      ? PRICING_CAPABILITIES.ARCHIVE_QUOTED
      : PRICING_CAPABILITIES.ARCHIVE_DRAFT;
    if (transitions.has("ARCHIVE") && capabilities.has(archiveCapability)) actions.push("ARCHIVE");
    return actions;
  }

  private async requireActor(identity: AuthenticatedIdentity, companyId: string) {
    const actor = await this.actors.load(identity);
    if (!actor || !actor.active) throw new PricingApplicationError("NOT_AUTHENTICATED", "An active Application User is required.");
    if (actor.companyId !== companyId) throw new PricingApplicationError("COMPANY_SCOPE_VIOLATION", "Application User does not belong to the requested Company.");
    return actor;
  }
}
