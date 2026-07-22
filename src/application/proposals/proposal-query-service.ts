import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import type { ProposalActorContextProvider, ProposalCapabilityEvaluator } from "@/application/proposals/proposal-capabilities";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import type {
  ProposalListFilter,
  ProposalListRecord,
  ProposalReadRepository
} from "@/application/proposals/proposal-repository";
import {
  projectAcceptance,
  projectExecutiveAuthorization,
  projectPermittedActions,
  projectReview,
  projectTimeline,
  type ProposalAcceptanceReadModel,
  type ProposalDraftReadModel,
  type ProposalExecutiveAuthorizationReadModel,
  type ProposalPermittedActionsReadModel,
  type ProposalReviewReadModel,
  type ProposalTimelineItemReadModel,
  type ProposalVersionReadModel
} from "@/application/proposals/proposal-workspace-projection";
import { encodeProposalConcurrencyToken } from "@/application/proposals/proposal-concurrency-token";

export interface ProposalDetailReadModel extends ProposalListRecord {
  readonly concurrencyToken: string;
  readonly engagementTypeCode: string;
  readonly currentVersionId: string | null;
  readonly submittedVersionId: string | null;
  readonly supersedesProposalId: string | null;
  readonly supersededByProposalId: string | null;
  readonly executedAgreementId: string | null;
  readonly expirationAt: string;
  readonly draft: ProposalDraftReadModel;
  readonly versions: readonly ProposalVersionReadModel[];
  readonly review: ProposalReviewReadModel;
  readonly executiveAuthorization: ProposalExecutiveAuthorizationReadModel;
  readonly acceptance: ProposalAcceptanceReadModel;
  readonly timeline: readonly ProposalTimelineItemReadModel[];
  readonly permittedActions: ProposalPermittedActionsReadModel;
}

export class ProposalQueryService {
  constructor(
    private readonly actors: ProposalActorContextProvider,
    private readonly repository: ProposalReadRepository,
    private readonly capabilities: ProposalCapabilityEvaluator
  ) {}

  async load(identity: AuthenticatedIdentity, companyId: string, proposalId: string) {
    const actor = await this.requireActor(identity, companyId);
    const loaded = await this.repository.detail(companyId, proposalId);
    if (!loaded) {
      throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal was not found.");
    }
    const state = loaded.state;
    const currentVersion = state.versions.find(({ versionId }) => versionId === state.currentVersionId);
    const submittedVersion = state.versions.find(
      ({ versionId }) => versionId === state.submittedVersionId
    );
    const effectiveCapabilities = await this.capabilities.capabilitiesFor(actor);
    const submittedEvent = state.events.find(({ eventType }) => eventType === "PROPOSAL_SUBMITTED");
    return {
      id: state.id,
      proposalNumber: state.proposalNumber,
      companyId: state.companyId,
      clientId: state.clientId,
      ownerId: state.ownerId,
      title: state.workingDraft.title,
      status: state.status,
      currentVersionNumber: currentVersion?.versionNumber ?? null,
      submittedVersionNumber: submittedVersion?.versionNumber ?? null,
      versionCount: state.versions.length,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      effectiveAt: state.effectiveAt,
      closedAt: state.closedAt,
      engagementTypeCode: state.engagementTypeCode,
      currentVersionId: state.currentVersionId,
      submittedVersionId: state.submittedVersionId,
      supersedesProposalId: state.supersedesProposalId,
      supersededByProposalId: state.supersededByProposalId,
      executedAgreementId: state.executedAgreementId,
      expirationAt: state.workingDraft.expirationAt,
      draft: {
        title: state.workingDraft.title,
        structuredContent: state.workingDraft.content,
        commercialTerms: state.workingDraft.commercialTerms,
        recipients: state.workingDraft.recipients,
        pricingSnapshot: state.pricingSnapshot,
        expirationAt: state.workingDraft.expirationAt,
        expirationOverrideReason: state.workingDraft.expirationOverrideReason
      },
      versions: state.versions.map((version) => ({
        id: version.versionId,
        number: version.versionNumber,
        createdAt: version.createdAt,
        createdByUserId: version.createdByUserId,
        revisionReason: version.revisionReason,
        status: state.submittedVersionId === version.versionId ? "SUBMITTED" : "SAVED",
        submittedAt: state.submittedVersionId === version.versionId ? submittedEvent?.occurredAt ?? null : null,
        submittedByUserId: state.submittedVersionId === version.versionId ? submittedEvent?.responsibleUserId ?? null : null
      })),
      review: projectReview(state),
      executiveAuthorization: projectExecutiveAuthorization(state),
      acceptance: projectAcceptance(state),
      timeline: projectTimeline(state),
      permittedActions: projectPermittedActions(state, actor, effectiveCapabilities),
      concurrencyToken: encodeProposalConcurrencyToken(loaded.revision)
    } satisfies ProposalDetailReadModel;
  }

  async list(
    identity: AuthenticatedIdentity,
    companyId: string,
    input: { limit?: number; cursor?: string; filter?: ProposalListFilter } = {}
  ) {
    await this.requireActor(identity, companyId);
    const limit = input.limit ?? 25;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new ProposalApplicationError("INVALID_REQUEST", "Limit must be from 1 through 100.");
    }
    if (input.cursor !== undefined && !input.cursor.trim()) {
      throw new ProposalApplicationError("INVALID_REQUEST", "Pagination cursor is invalid.");
    }
    return this.repository.list(companyId, {
      limit,
      cursor: input.cursor,
      filter: input.filter
    });
  }

  async edit(identity: AuthenticatedIdentity, companyId: string, proposalId: string) {
    const detail = await this.load(identity, companyId, proposalId);
    return {
      id: detail.id,
      proposalNumber: detail.proposalNumber,
      draft: detail.draft,
      permittedActions: detail.permittedActions,
      concurrencyToken: detail.concurrencyToken
    };
  }

  async workflow(identity: AuthenticatedIdentity, companyId: string, proposalId: string) {
    const detail = await this.load(identity, companyId, proposalId);
    return {
      id: detail.id,
      status: detail.status,
      review: detail.review,
      executiveAuthorization: detail.executiveAuthorization,
      permittedActions: detail.permittedActions,
      concurrencyToken: detail.concurrencyToken
    };
  }

  async history(identity: AuthenticatedIdentity, companyId: string, proposalId: string) {
    const detail = await this.load(identity, companyId, proposalId);
    return { id: detail.id, versions: detail.versions, timeline: detail.timeline };
  }

  private async requireActor(identity: AuthenticatedIdentity, companyId: string) {
    const actor = await this.actors.load(identity);
    if (!actor) {
      throw new ProposalApplicationError("NOT_AUTHENTICATED", "Application User was not found.");
    }
    if (!actor.active) {
      throw new ProposalApplicationError("NOT_AUTHENTICATED", "Application User is inactive.");
    }
    if (actor.companyId !== companyId) {
      throw new ProposalApplicationError(
        "COMPANY_SCOPE_VIOLATION",
        "Application User does not belong to the requested Company."
      );
    }
    return actor;
  }
}
