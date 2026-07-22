import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import {
  PROPOSAL_CAPABILITIES,
  type ProposalActorContext,
  type ProposalActorContextProvider,
  type ProposalCapability,
  type ProposalCapabilityEvaluator
} from "@/application/proposals/proposal-capabilities";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import type {
  LoadedProposal,
  ProposalRepository,
  ProposalUnitOfWork
} from "@/application/proposals/proposal-repository";
import type { ProposalBusinessEventV1 } from "@/domain/proposals/contracts";
import type { EngagementTypePolicyV1 } from "@/domain/proposals/engagement-type-policies";
import type { ProposalPricingVersionResolver } from "@/application/proposals/proposal-pricing-version";
import {
  ProposalAggregate,
  ProposalDomainError,
  type CreateReplacementProposalInput,
  type ProposalCommandContext,
  type ProposalWorkingDraft
} from "@/domain/proposals/proposal-domain";

export interface ProposalCommandRequest {
  readonly identity: AuthenticatedIdentity;
  readonly companyId: string;
  readonly requestId: string;
  readonly occurredAt: string;
  readonly expectedRevision?: number;
}

export interface ProposalCommandResult {
  readonly aggregate: ProposalAggregate;
  readonly revision: number;
  readonly idempotentReplay: boolean;
}

export interface ProposalIdGenerator {
  nextId(kind: "event" | "version" | "acceptance" | "withdrawal"): string;
}

export interface ProposalApplicationDependencies {
  readonly actors: ProposalActorContextProvider;
  readonly capabilities: ProposalCapabilityEvaluator;
  readonly unitOfWork: ProposalUnitOfWork;
  readonly pricingVersions: ProposalPricingVersionResolver;
  readonly ids?: ProposalIdGenerator;
}

type DraftUpdate = Partial<
  Pick<ProposalWorkingDraft, "title" | "content" | "commercialTerms" | "recipients" | "expirationAt">
> & { expirationOverrideReason?: string | null };

const defaultIds: ProposalIdGenerator = {
  nextId(kind) {
    return `${kind}-${crypto.randomUUID()}`;
  }
};

function requireText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new ProposalApplicationError("INVALID_REQUEST", `${field} is required.`);
  }
  return normalized;
}

function eventTypeOf(loaded: LoadedProposal, eventId: string) {
  return loaded.aggregate.state.events.find((event) => event.eventId === eventId)?.eventType;
}

export class ProposalApplicationService {
  private readonly ids: ProposalIdGenerator;

  constructor(private readonly dependencies: ProposalApplicationDependencies) {
    this.ids = dependencies.ids ?? defaultIds;
  }

  async createProposal(
    request: ProposalCommandRequest,
    input: {
      clientId: string;
      ownerId?: string;
      engagementTypePolicy: EngagementTypePolicyV1;
      pricingProjectId: string;
      pricingVersionId: string;
      title: string;
      expirationAt?: string;
      expirationOverrideReason?: string;
    }
  ) {
    return this.run(request, PROPOSAL_CAPABILITIES.CREATE, async (actor, repository, eventId, transactionPricingVersions) => {
      const replay = await this.replay(repository, actor.companyId, eventId, "PROPOSAL_CREATED");
      if (replay) return replay;
      const pricingSnapshot = await (transactionPricingVersions ?? this.dependencies.pricingVersions).resolve({
        companyId: actor.companyId,
        clientId: input.clientId,
        pricingProjectId: input.pricingProjectId,
        pricingVersionId: input.pricingVersionId,
        capturedAt: request.occurredAt
      });
      if (!pricingSnapshot) {
        throw new ProposalApplicationError(
          "INVALID_REQUEST",
          "The selected Pricing Version is not the current approved Version for this Company and Client."
        );
      }
      const identity = await repository.allocateProposalIdentity();
      const aggregate = ProposalAggregate.create(
        {
          ...identity,
          companyId: actor.companyId,
          clientId: input.clientId,
          ownerId: input.ownerId ?? actor.userId,
          engagementTypePolicy: input.engagementTypePolicy,
          pricingSnapshot,
          title: input.title,
          expirationAt: input.expirationAt,
          expirationOverrideReason: input.expirationOverrideReason
        },
        this.context(actor, request, eventId)
      );
      const written = await repository.insert(aggregate);
      return { aggregate, revision: written.revision, idempotentReplay: false };
    });
  }

  attachPricingVersion(
    request: ProposalCommandRequest,
    proposalId: string,
    input: { readonly pricingProjectId: string; readonly pricingVersionId: string }
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.EDIT_DRAFT,
      "PROPOSAL_PRICING_VERSION_ATTACHED",
      async (aggregate, context, transactionPricingVersions) => {
        const snapshot = await (transactionPricingVersions ?? this.dependencies.pricingVersions).resolve({
          companyId: aggregate.state.companyId,
          clientId: aggregate.state.clientId,
          pricingProjectId: input.pricingProjectId,
          pricingVersionId: input.pricingVersionId,
          capturedAt: request.occurredAt
        });
        if (!snapshot) throw new ProposalApplicationError("INVALID_REQUEST", "The selected Pricing Version is not eligible for this Proposal.");
        aggregate.attachPricingVersion(snapshot, context);
      }
    );
  }

  submitForExecutiveAuthorization(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(request, proposalId, PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE,
      "PROPOSAL_EXECUTIVE_AUTHORIZATION_REQUESTED",
      (aggregate, context) => aggregate.submitForExecutiveAuthorization(context));
  }

  approveProposal(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(request, proposalId, PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE,
      "PROPOSAL_APPROVED", (aggregate, context) => aggregate.approveProposal(context));
  }

  rejectProposal(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(request, proposalId, PROPOSAL_CAPABILITIES.QUALITY_REVIEW,
      "PROPOSAL_REJECTED", (aggregate, context) => aggregate.rejectProposal(context));
  }

  updateDraft(request: ProposalCommandRequest, proposalId: string, update: DraftUpdate) {
    return this.standard(request, proposalId, PROPOSAL_CAPABILITIES.EDIT_DRAFT, null, (aggregate) =>
      aggregate.updateDraft(update, request.occurredAt)
    );
  }

  saveProposalVersion(
    request: ProposalCommandRequest,
    proposalId: string,
    revisionReason?: string
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.SAVE_VERSION,
      "PROPOSAL_VERSION_SAVED",
      (aggregate, context) =>
        aggregate.saveVersion({ versionId: this.ids.nextId("version"), revisionReason }, context)
    );
  }

  requestQualityReview(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.REQUEST_REVIEW,
      "PROPOSAL_INTERNAL_REVIEW_REQUESTED",
      (aggregate, context) => aggregate.requestQualityReview(context)
    );
  }

  requestChanges(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.QUALITY_REVIEW,
      "PROPOSAL_CHANGES_REQUESTED",
      (aggregate, context) => aggregate.requestChanges(context)
    );
  }

  submitThroughQualityReview(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.QUALITY_REVIEW,
      "PROPOSAL_SUBMITTED",
      (aggregate, context) =>
        aggregate.submit(context, {
          method: "QUALITY_REVIEW",
          reviewerUserId: context.responsibleUserId
        })
    );
  }

  submitThroughExecutiveAuthorization(
    request: ProposalCommandRequest,
    proposalId: string,
    businessJustification: string
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE,
      "PROPOSAL_SUBMITTED",
      (aggregate, context) =>
        aggregate.submit(context, {
          method: "EXECUTIVE_AUTHORIZATION",
          authorizedByUserId: context.responsibleUserId,
          businessJustification: requireText(businessJustification, "Business Justification")
        })
    );
  }

  recordProposalViewed(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY,
      "PROPOSAL_VIEWED",
      (aggregate, context) => aggregate.recordViewed(context)
    );
  }

  recordClientAcceptance(
    request: ProposalCommandRequest,
    proposalId: string,
    input: { recipientId: string; notes?: string }
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY,
      "PROPOSAL_ACCEPTED",
      (aggregate, context) =>
        aggregate.acceptByRecipient(
          {
            acceptanceId: this.ids.nextId("acceptance"),
            recipientId: input.recipientId,
            notes: input.notes
          },
          context
        )
    );
  }

  recordVerbalAcceptance(
    request: ProposalCommandRequest,
    proposalId: string,
    input: { recipientId: string; reason: string; notes: string }
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.MANAGE_ACCEPTANCE,
      "PROPOSAL_VERBAL_ACCEPTANCE_RECORDED",
      (aggregate, context) =>
        aggregate.recordVerbalAcceptance(
          { ...input, acceptanceId: this.ids.nextId("acceptance") },
          context
        )
    );
  }

  withdrawAcceptance(
    request: ProposalCommandRequest,
    proposalId: string,
    reason: string
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.MANAGE_ACCEPTANCE,
      "PROPOSAL_ACCEPTANCE_WITHDRAWN",
      (aggregate, context) =>
        aggregate.withdrawAcceptance(
          { withdrawalId: this.ids.nextId("withdrawal"), reason },
          context
        )
    );
  }

  linkExecutedAgreement(
    request: ProposalCommandRequest,
    proposalId: string,
    agreementId: string
  ) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.LINK_AGREEMENT,
      null,
      (aggregate) => aggregate.linkExecutedAgreement(agreementId, request.occurredAt)
    );
  }

  declineProposal(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY,
      "PROPOSAL_DECLINED",
      (aggregate, context) => aggregate.decline(context)
    );
  }

  expireProposal(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.MANAGE_LIFECYCLE,
      "PROPOSAL_EXPIRED",
      (aggregate, context) => aggregate.expire(context)
    );
  }

  archiveProposal(request: ProposalCommandRequest, proposalId: string) {
    return this.standard(
      request,
      proposalId,
      PROPOSAL_CAPABILITIES.ARCHIVE,
      "PROPOSAL_ARCHIVED",
      (aggregate, context) => aggregate.archive(context)
    );
  }

  async createReplacementProposal(
    request: ProposalCommandRequest,
    originalProposalId: string,
    input: Omit<CreateReplacementProposalInput, "id" | "proposalNumber" | "ownerId"> & {
      ownerId?: string;
    }
  ) {
    return this.run(
      request,
      PROPOSAL_CAPABILITIES.CREATE_REPLACEMENT,
      async (actor, repository, eventId) => {
        const replay = await this.replay(repository, actor.companyId, eventId, "PROPOSAL_CREATED");
        if (replay) {
          if (replay.aggregate.state.supersedesProposalId !== originalProposalId) {
            throw new ProposalApplicationError(
              "INVALID_REQUEST",
              "Request identity was already used for a different replacement Proposal."
            );
          }
          return replay;
        }
        const original = await this.load(repository, actor.companyId, originalProposalId);
        const identity = await repository.allocateProposalIdentity();
        const replacement = ProposalAggregate.createReplacement(
          original.aggregate,
          { ...input, ...identity, ownerId: input.ownerId ?? actor.userId },
          this.context(actor, request, eventId)
        );
        const written = await repository.insert(replacement);
        return { aggregate: replacement, revision: written.revision, idempotentReplay: false };
      }
    );
  }

  async supersedeOriginalProposal(
    request: ProposalCommandRequest,
    originalProposalId: string,
    replacementProposalId: string
  ) {
    return this.run(request, PROPOSAL_CAPABILITIES.SUPERSEDE, async (actor, repository, eventId) => {
      const original = await this.load(repository, actor.companyId, originalProposalId);
      const existingType = eventTypeOf(original, eventId);
      if (existingType) {
        if (
          existingType !== "PROPOSAL_SUPERSEDED" ||
          original.aggregate.state.supersededByProposalId !== replacementProposalId
        ) {
          throw new ProposalApplicationError(
            "INVALID_REQUEST",
            "Request identity was already used for a different Proposal command."
          );
        }
        return { ...original, idempotentReplay: true };
      }
      const replacement = await this.load(repository, actor.companyId, replacementProposalId);
      original.aggregate.supersedeBy(
        replacement.aggregate,
        this.context(actor, request, eventId)
      );
      const written = await repository.save(original.aggregate, original.revision);
      return { aggregate: original.aggregate, revision: written.revision, idempotentReplay: false };
    });
  }

  private standard(
    request: ProposalCommandRequest,
    proposalId: string,
    capability: ProposalCapability,
    expectedEventType: ProposalBusinessEventV1["eventType"] | null,
    command: (
      aggregate: ProposalAggregate,
      context: ProposalCommandContext,
      pricingVersions?: ProposalPricingVersionResolver
    ) => unknown
  ) {
    return this.run(request, capability, async (actor, repository, eventId, pricingVersions) => {
      const loaded = await this.load(repository, actor.companyId, proposalId);
      if (expectedEventType) {
        const existingType = eventTypeOf(loaded, eventId);
        if (existingType) {
          if (existingType !== expectedEventType) {
            throw new ProposalApplicationError(
              "INVALID_REQUEST",
              "Request identity was already used for a different Proposal command."
            );
          }
          return { ...loaded, idempotentReplay: true };
        }
      }
      if (request.expectedRevision !== undefined && request.expectedRevision !== loaded.revision) {
        throw new ProposalApplicationError(
          "OPTIMISTIC_CONCURRENCY_CONFLICT",
          `Expected Proposal revision ${request.expectedRevision}; found ${loaded.revision}.`
        );
      }
      await command(loaded.aggregate, this.context(actor, request, eventId), pricingVersions);
      const written = await repository.save(loaded.aggregate, loaded.revision);
      return { aggregate: loaded.aggregate, revision: written.revision, idempotentReplay: false };
    });
  }

  private async run(
    request: ProposalCommandRequest,
    capability: ProposalCapability,
    work: (
      actor: ProposalActorContext,
      repository: ProposalRepository,
      eventId: string,
      pricingVersions?: ProposalPricingVersionResolver
    ) => Promise<ProposalCommandResult>
  ) {
    try {
      const actor = await this.actor(request);
      const capabilities = await this.dependencies.capabilities.capabilitiesFor(actor);
      if (!capabilities.has(capability)) {
        throw new ProposalApplicationError(
          "CAPABILITY_DENIED",
          `Capability ${capability} is required.`
        );
      }
      const eventId = `proposal-event-${requireText(request.requestId, "Request identity")}`;
      return await this.dependencies.unitOfWork.execute((repository, pricingVersions) =>
        work(actor, repository, eventId, pricingVersions)
      );
    } catch (error) {
      throw this.translate(error);
    }
  }

  private async actor(request: ProposalCommandRequest) {
    const actor = await this.dependencies.actors.load(request.identity);
    if (!actor || !actor.active) {
      throw new ProposalApplicationError(
        "NOT_AUTHENTICATED",
        "An active authenticated Application User is required."
      );
    }
    if (actor.companyId !== request.companyId) {
      throw new ProposalApplicationError(
        "COMPANY_SCOPE_VIOLATION",
        "The authenticated actor does not belong to the requested Company."
      );
    }
    return actor;
  }

  private context(
    actor: ProposalActorContext,
    request: ProposalCommandRequest,
    eventId: string
  ): ProposalCommandContext {
    return {
      eventId,
      occurredAt: request.occurredAt,
      responsibleUserId: actor.userId
    };
  }

  private async load(repository: ProposalRepository, companyId: string, proposalId: string) {
    const loaded = await repository.findById(companyId, proposalId);
    if (!loaded) {
      throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal was not found.");
    }
    return loaded;
  }

  private async replay(
    repository: ProposalRepository,
    companyId: string,
    eventId: string,
    expectedType: ProposalBusinessEventV1["eventType"]
  ) {
    const loaded = await repository.findByEventId(companyId, eventId);
    if (!loaded) return null;
    if (eventTypeOf(loaded, eventId) !== expectedType) {
      throw new ProposalApplicationError(
        "INVALID_REQUEST",
        "Request identity was already used for a different Proposal command."
      );
    }
    return { ...loaded, idempotentReplay: true };
  }

  private translate(error: unknown): ProposalApplicationError {
    if (error instanceof ProposalApplicationError) return error;
    if (error instanceof ProposalDomainError) {
      return new ProposalApplicationError("DOMAIN_RULE_VIOLATION", error.message, error);
    }
    if (error instanceof Error && error.name === "ProposalConcurrencyError") {
      return new ProposalApplicationError(
        "OPTIMISTIC_CONCURRENCY_CONFLICT",
        error.message,
        error
      );
    }
    if (error instanceof Error && error.name === "ProposalImmutableConflictError") {
      return new ProposalApplicationError(
        "IMMUTABLE_PERSISTENCE_CONFLICT",
        error.message,
        error
      );
    }
    return new ProposalApplicationError(
      "TRANSACTION_FAILURE",
      "Proposal transaction failed.",
      error
    );
  }
}
