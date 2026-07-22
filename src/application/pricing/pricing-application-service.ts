import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import {
  PRICING_CAPABILITIES,
  type PricingActorContext,
  type PricingActorContextProvider,
  type PricingCapability,
  type PricingCapabilityEvaluator
} from "@/application/pricing/pricing-capabilities";
import { PricingApplicationError } from "@/application/pricing/pricing-application-errors";
import {
  PricingConcurrencyError,
  PricingGovernanceError,
  PricingProject,
  PricingVersionNumber,
  ReviewFinding,
  type PricingCommandContext,
  type PricingCommandResult,
  type PricingDraft
} from "@/domain/pricing";
import type { PricingAggregateRepository } from "@/infrastructure/database/pricing-repository";

export interface PricingCommandRequest {
  readonly identity: AuthenticatedIdentity;
  readonly companyId: string;
  readonly requestId: string;
  readonly occurredAt: string;
  readonly expectedRevision: number;
}

export type CreatePricingProjectRequest = Omit<PricingCommandRequest, "expectedRevision">;

export interface PricingIdentityGenerator {
  pricingProjectId(requestId: string): string;
  pricingVersionId(requestId: string): string;
  estimateNumber(): Promise<string>;
}

export interface PricingApplicationDependencies {
  readonly actors: PricingActorContextProvider;
  readonly capabilities: PricingCapabilityEvaluator;
  readonly repository: PricingAggregateRepository;
  readonly ids: PricingIdentityGenerator;
}

export interface PricingApplicationCommandResult {
  readonly aggregate: PricingProject;
  readonly revision: number;
  readonly idempotentReplay: boolean;
  readonly events: PricingCommandResult["events"];
}

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new PricingApplicationError("INVALID_REQUEST", `${label} is required.`);
  return normalized;
}

export class PricingApplicationService {
  constructor(private readonly dependencies: PricingApplicationDependencies) {}

  async createPricingProject(
    request: CreatePricingProjectRequest,
    input: { readonly clientId: string; readonly ownerId?: string; readonly draft: PricingDraft }
  ): Promise<PricingApplicationCommandResult> {
    return this.run(request, PRICING_CAPABILITIES.CREATE, async (actor) => {
      const requestId = required(request.requestId, "Request identity");
      const projectId = this.dependencies.ids.pricingProjectId(requestId);
      const existing = await this.dependencies.repository.load(actor.companyId, projectId);
      if (existing) {
        const replayCandidate = PricingProject.create({
          pricingProjectId: projectId,
          companyId: actor.companyId,
          clientId: input.clientId,
          ownerId: input.ownerId ?? actor.userId,
          estimateNumber: existing.aggregate.estimateNumber,
          draft: input.draft
        }, this.creationContext(actor, request)).project;
        if (
          existing.aggregate.clientId.value !== replayCandidate.clientId.value ||
          existing.aggregate.ownerId.value !== replayCandidate.ownerId.value ||
          JSON.stringify(existing.aggregate.draft) !== JSON.stringify(replayCandidate.draft)
        ) {
          throw new PricingApplicationError(
            "INVALID_REQUEST",
            "Request identity was already used for a different Pricing Project command."
          );
        }
        return { aggregate: existing.aggregate, revision: existing.revision, idempotentReplay: true, events: [] };
      }
      const created = PricingProject.create({
        pricingProjectId: projectId,
        companyId: actor.companyId,
        clientId: input.clientId,
        ownerId: input.ownerId ?? actor.userId,
        estimateNumber: await this.dependencies.ids.estimateNumber(),
        draft: input.draft
      }, this.creationContext(actor, request));
      const written = await this.dependencies.repository.save(created.project, 0, created.result.events);
      return {
        aggregate: created.project,
        revision: written.revision,
        idempotentReplay: created.result.idempotentReplay,
        events: created.result.events
      };
    });
  }

  updateDraft(request: PricingCommandRequest, pricingProjectId: string, draft: PricingDraft) {
    return this.standard(request, pricingProjectId, PRICING_CAPABILITIES.EDIT_DRAFT,
      (aggregate, context) => aggregate.updateDraft(draft, context));
  }

  saveVersion(request: PricingCommandRequest, pricingProjectId: string) {
    return this.standard(request, pricingProjectId, PRICING_CAPABILITIES.SAVE_VERSION,
      (aggregate, context) => aggregate.saveVersion({
        pricingVersionId: this.dependencies.ids.pricingVersionId(required(request.requestId, "Request identity")),
        content: aggregate.draft
      }, context));
  }

  requestQualityReview(request: PricingCommandRequest, pricingProjectId: string, versionNumber: number) {
    return this.standard(request, pricingProjectId, PRICING_CAPABILITIES.REQUEST_REVIEW,
      (aggregate, context) => aggregate.requestQualityReview(PricingVersionNumber.create(versionNumber), context));
  }

  approveVersion(request: PricingCommandRequest, pricingProjectId: string) {
    return this.standard(request, pricingProjectId, PRICING_CAPABILITIES.QUALITY_REVIEW,
      (aggregate, context) => aggregate.approveVersion(context));
  }

  rejectVersion(request: PricingCommandRequest, pricingProjectId: string, finding: string) {
    return this.standard(request, pricingProjectId, PRICING_CAPABILITIES.QUALITY_REVIEW,
      (aggregate, context) => aggregate.rejectVersion(ReviewFinding.create(finding), context));
  }

  beginRevision(request: PricingCommandRequest, pricingProjectId: string) {
    return this.standard(request, pricingProjectId, PRICING_CAPABILITIES.BEGIN_REVISION,
      (aggregate, context) => aggregate.beginRevision(context));
  }

  archiveProject(request: PricingCommandRequest, pricingProjectId: string) {
    return this.standard(request, pricingProjectId, null, (aggregate, context, capabilities) => {
      const capability = aggregate.status === "QUOTED"
        ? PRICING_CAPABILITIES.ARCHIVE_QUOTED
        : PRICING_CAPABILITIES.ARCHIVE_DRAFT;
      this.requireCapability(capabilities, capability);
      return aggregate.archive(context);
    });
  }

  private async standard(
    request: PricingCommandRequest,
    pricingProjectId: string,
    capability: PricingCapability | null,
    command: (
      aggregate: PricingProject,
      context: PricingCommandContext,
      capabilities: ReadonlySet<PricingCapability>
    ) => PricingCommandResult
  ): Promise<PricingApplicationCommandResult> {
    return this.run(request, capability, async (actor, capabilities) => {
      const loaded = await this.dependencies.repository.load(actor.companyId, pricingProjectId);
      if (!loaded) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Pricing Project was not found.");
      const result = command(loaded.aggregate, this.commandContext(actor, request), capabilities);
      if (result.idempotentReplay) {
        return { aggregate: loaded.aggregate, revision: loaded.revision, idempotentReplay: true, events: [] };
      }
      const written = await this.dependencies.repository.save(loaded.aggregate, loaded.revision, result.events);
      return {
        aggregate: loaded.aggregate,
        revision: written.revision,
        idempotentReplay: false,
        events: result.events
      };
    });
  }

  private async run<T>(
    request: Omit<PricingCommandRequest, "expectedRevision"> & { readonly expectedRevision?: number },
    capability: PricingCapability | null,
    work: (actor: PricingActorContext, capabilities: ReadonlySet<PricingCapability>) => Promise<T>
  ): Promise<T> {
    try {
      const actor = await this.dependencies.actors.load(request.identity);
      if (!actor || !actor.active) {
        throw new PricingApplicationError("NOT_AUTHENTICATED", "An active authenticated Application User is required.");
      }
      if (actor.companyId !== request.companyId) {
        throw new PricingApplicationError("COMPANY_SCOPE_VIOLATION", "The authenticated actor does not belong to the requested Company.");
      }
      const capabilities = await this.dependencies.capabilities.capabilitiesFor(actor);
      if (capability) this.requireCapability(capabilities, capability);
      return await work(actor, capabilities);
    } catch (error) {
      throw this.translate(error);
    }
  }

  private requireCapability(capabilities: ReadonlySet<PricingCapability>, capability: PricingCapability) {
    if (!capabilities.has(capability)) {
      throw new PricingApplicationError("CAPABILITY_DENIED", `Capability ${capability} is required.`);
    }
  }

  private creationContext(actor: PricingActorContext, request: CreatePricingProjectRequest) {
    const requestId = required(request.requestId, "Request identity");
    return {
      commandId: `pricing-command-${requestId}`,
      eventId: `pricing-event-${requestId}`,
      actorId: actor.userId,
      occurredAt: request.occurredAt
    };
  }

  private commandContext(actor: PricingActorContext, request: PricingCommandRequest): PricingCommandContext {
    const requestId = required(request.requestId, "Request identity");
    return {
      ...this.creationContext(actor, request),
      commandId: `pricing-command-${requestId}`,
      eventId: `pricing-event-${requestId}`,
      expectedRevision: request.expectedRevision
    };
  }

  private translate(error: unknown): PricingApplicationError {
    if (error instanceof PricingApplicationError) return error;
    if (error instanceof PricingConcurrencyError) {
      return new PricingApplicationError("OPTIMISTIC_CONCURRENCY_CONFLICT", error.message, error);
    }
    if (error instanceof PricingGovernanceError) {
      return new PricingApplicationError("DOMAIN_RULE_VIOLATION", error.message, error);
    }
    return new PricingApplicationError("TRANSACTION_FAILURE", "Pricing transaction failed.", error);
  }
}
