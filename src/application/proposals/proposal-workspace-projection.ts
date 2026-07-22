import {
  PROPOSAL_CAPABILITIES,
  type ProposalActorContext,
  type ProposalCapability
} from "@/application/proposals/proposal-capabilities";
import type {
  JsonObject,
  ProposalBusinessEventV1,
  ProposalPricingSnapshot,
  ProposalStructuredContentV1
} from "@/domain/proposals/contracts";
import type {
  ProposalAcceptance,
  ProposalAcceptanceWithdrawal,
  ProposalCommercialTerms,
  ProposalRecipient,
  ProposalState
} from "@/domain/proposals/proposal-domain";

export interface ProposalDraftReadModel {
  readonly title: string;
  readonly structuredContent: ProposalStructuredContentV1;
  readonly commercialTerms: ProposalCommercialTerms;
  readonly recipients: readonly ProposalRecipient[];
  readonly pricingSnapshot: ProposalPricingSnapshot;
  readonly expirationAt: string;
  readonly expirationOverrideReason: string | null;
}

export interface ProposalVersionReadModel {
  readonly id: string;
  readonly number: number;
  readonly status: "SAVED" | "SUBMITTED";
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly revisionReason: string | null;
  readonly submittedAt: string | null;
  readonly submittedByUserId: string | null;
}

export interface ProposalReviewReadModel {
  readonly status: "NOT_REQUESTED" | "PENDING" | "CHANGES_REQUESTED" | "APPROVED";
  readonly requestedAt: string | null;
  readonly requestedByUserId: string | null;
  readonly reviewedAt: string | null;
  readonly reviewedByUserId: string | null;
  readonly outcome: "CHANGES_REQUESTED" | "SUBMITTED" | null;
}

export interface ProposalExecutiveAuthorizationReadModel {
  readonly status: "NOT_USED" | "AUTHORIZED_AND_SUBMITTED";
  readonly submittedAt: string | null;
  readonly submittedByUserId: string | null;
  readonly authorizedAt: string | null;
  readonly authorizedByUserId: string | null;
  readonly businessJustification: string | null;
}

export interface ProposalAcceptanceEvidenceReadModel {
  readonly acceptanceId: string;
  readonly proposalVersionId: string;
  readonly occurredAt: string;
  readonly channel: ProposalAcceptance["channel"];
  readonly recipientId: string;
  readonly recordedByUserId: string | null;
  readonly reason: string | null;
  readonly notes: string;
  readonly current: boolean;
}

export interface ProposalAcceptanceWithdrawalReadModel {
  readonly withdrawalId: string;
  readonly acceptanceId: string;
  readonly occurredAt: string;
  readonly recordedByUserId: string;
  readonly reason: string;
}

export interface ProposalAcceptanceReadModel {
  readonly viewedAt: string | null;
  readonly acceptances: readonly ProposalAcceptanceEvidenceReadModel[];
  readonly withdrawals: readonly ProposalAcceptanceWithdrawalReadModel[];
  readonly declinedAt: string | null;
  readonly executedAgreementId: string | null;
}

export type ProposalTimelineType =
  | "PROPOSAL_CREATED"
  | "REPLACEMENT_CREATED"
  | "VERSION_SAVED"
  | "QUALITY_REVIEW_REQUESTED"
  | "PRICING_VERSION_ATTACHED"
  | "EXECUTIVE_AUTHORIZATION_REQUESTED"
  | "PROPOSAL_APPROVED"
  | "PROPOSAL_REJECTED"
  | "CHANGES_REQUESTED"
  | "SUBMITTED_QUALITY_REVIEW"
  | "SUBMITTED_EXECUTIVE_AUTHORIZATION"
  | "PROPOSAL_VIEWED"
  | "CLIENT_ACCEPTED"
  | "VERBAL_ACCEPTANCE_RECORDED"
  | "ACCEPTANCE_WITHDRAWN"
  | "PROPOSAL_DECLINED"
  | "PROPOSAL_EXPIRED"
  | "PROPOSAL_SUPERSEDED"
  | "PROPOSAL_ARCHIVED";

export interface ProposalTimelineItemReadModel {
  readonly id: string;
  readonly type: ProposalTimelineType;
  readonly occurredAt: string;
  readonly actorUserId: string | null;
  readonly label: string;
  readonly summary: string;
  readonly versionId: string | null;
  readonly relatedProposalId: string | null;
  readonly agreementId: string | null;
}

export interface ProposalPermittedActionsReadModel {
  readonly generateRepresentation: boolean;
  readonly createDelivery: boolean;
  readonly attachPricingVersion: boolean;
  readonly updateDraft: boolean;
  readonly saveVersion: boolean;
  readonly requestQualityReview: boolean;
  readonly submitForExecutiveAuthorization: boolean;
  readonly approve: boolean;
  readonly reject: boolean;
  readonly requestChanges: boolean;
  readonly submitThroughQualityReview: boolean;
  readonly submitThroughExecutiveAuthorization: boolean;
  readonly recordViewed: boolean;
  readonly recordClientAcceptance: boolean;
  readonly recordVerbalAcceptance: boolean;
  readonly withdrawAcceptance: boolean;
  readonly linkExecutedAgreement: boolean;
  readonly decline: boolean;
  readonly expire: boolean;
  readonly createReplacement: boolean;
  readonly supersede: boolean;
  readonly archive: boolean;
}

function metadataString(metadata: JsonObject, field: string) {
  const value = metadata[field];
  return typeof value === "string" && value ? value : null;
}

function lastEvent(state: ProposalState, type: ProposalBusinessEventV1["eventType"]) {
  return [...state.events].reverse().find((event) => event.eventType === type) ?? null;
}

function submissionEvent(state: ProposalState) {
  return lastEvent(state, "PROPOSAL_SUBMITTED");
}

export function projectReview(state: ProposalState): ProposalReviewReadModel {
  const requested = lastEvent(state, "PROPOSAL_INTERNAL_REVIEW_REQUESTED");
  const changes = lastEvent(state, "PROPOSAL_CHANGES_REQUESTED");
  const submitted = submissionEvent(state);
  const qualitySubmission = submitted && metadataString(submitted.metadata, "submissionMethod") === "QUALITY_REVIEW" ? submitted : null;
  const reviewed = qualitySubmission ?? changes;
  return {
    status: qualitySubmission ? "APPROVED" : state.status === "INTERNAL_REVIEW" ? "PENDING" : changes && (!requested || changes.occurredAt >= requested.occurredAt) ? "CHANGES_REQUESTED" : "NOT_REQUESTED",
    requestedAt: requested?.occurredAt ?? null,
    requestedByUserId: requested ? metadataString(requested.metadata, "requestedByUserId") ?? requested.responsibleUserId : null,
    reviewedAt: reviewed?.occurredAt ?? null,
    reviewedByUserId: reviewed?.responsibleUserId ?? null,
    outcome: qualitySubmission ? "SUBMITTED" : changes ? "CHANGES_REQUESTED" : null
  };
}

export function projectExecutiveAuthorization(state: ProposalState): ProposalExecutiveAuthorizationReadModel {
  const submitted = submissionEvent(state);
  const executive = submitted && metadataString(submitted.metadata, "submissionMethod") === "EXECUTIVE_AUTHORIZATION" ? submitted : null;
  const author = executive ? metadataString(executive.metadata, "authorizedByUserId") ?? executive.responsibleUserId : null;
  return {
    status: executive ? "AUTHORIZED_AND_SUBMITTED" : "NOT_USED",
    submittedAt: executive?.occurredAt ?? null,
    submittedByUserId: author,
    authorizedAt: executive?.occurredAt ?? null,
    authorizedByUserId: author,
    businessJustification: executive ? metadataString(executive.metadata, "businessJustification") : null
  };
}

export function projectAcceptance(state: ProposalState): ProposalAcceptanceReadModel {
  return {
    viewedAt: lastEvent(state, "PROPOSAL_VIEWED")?.occurredAt ?? null,
    acceptances: state.acceptances.map((acceptance) => ({
      acceptanceId: acceptance.acceptanceId,
      proposalVersionId: acceptance.proposalVersionId,
      occurredAt: acceptance.acceptedAt,
      channel: acceptance.channel,
      recipientId: acceptance.recipientId,
      recordedByUserId: acceptance.responsibleUserId,
      reason: acceptance.reason,
      notes: acceptance.notes,
      current: state.currentAcceptanceId === acceptance.acceptanceId
    })),
    withdrawals: state.acceptanceWithdrawals.map((withdrawal: ProposalAcceptanceWithdrawal) => ({
      withdrawalId: withdrawal.withdrawalId,
      acceptanceId: withdrawal.acceptanceId,
      occurredAt: withdrawal.withdrawnAt,
      recordedByUserId: withdrawal.responsibleUserId,
      reason: withdrawal.reason
    })),
    declinedAt: lastEvent(state, "PROPOSAL_DECLINED")?.occurredAt ?? null,
    executedAgreementId: state.executedAgreementId
  };
}

const timelineBase: Record<ProposalBusinessEventV1["eventType"], { type: ProposalTimelineType; label: string }> = {
  PROPOSAL_CREATED: { type: "PROPOSAL_CREATED", label: "Proposal created" },
  PROPOSAL_VERSION_SAVED: { type: "VERSION_SAVED", label: "Version saved" },
  PROPOSAL_INTERNAL_REVIEW_REQUESTED: { type: "QUALITY_REVIEW_REQUESTED", label: "Quality Review requested" },
  PROPOSAL_PRICING_VERSION_ATTACHED: { type: "PRICING_VERSION_ATTACHED", label: "Pricing Version attached" },
  PROPOSAL_EXECUTIVE_AUTHORIZATION_REQUESTED: { type: "EXECUTIVE_AUTHORIZATION_REQUESTED", label: "Executive Authorization requested" },
  PROPOSAL_APPROVED: { type: "PROPOSAL_APPROVED", label: "Proposal approved" },
  PROPOSAL_REJECTED: { type: "PROPOSAL_REJECTED", label: "Proposal rejected" },
  PROPOSAL_CHANGES_REQUESTED: { type: "CHANGES_REQUESTED", label: "Changes requested" },
  PROPOSAL_SUBMITTED: { type: "SUBMITTED_QUALITY_REVIEW", label: "Proposal submitted" },
  PROPOSAL_VIEWED: { type: "PROPOSAL_VIEWED", label: "Proposal viewed" },
  PROPOSAL_ACCEPTED: { type: "CLIENT_ACCEPTED", label: "Client acceptance recorded" },
  PROPOSAL_VERBAL_ACCEPTANCE_RECORDED: { type: "VERBAL_ACCEPTANCE_RECORDED", label: "Verbal acceptance recorded" },
  PROPOSAL_ACCEPTANCE_WITHDRAWN: { type: "ACCEPTANCE_WITHDRAWN", label: "Acceptance withdrawn" },
  PROPOSAL_DECLINED: { type: "PROPOSAL_DECLINED", label: "Proposal declined" },
  PROPOSAL_EXPIRED: { type: "PROPOSAL_EXPIRED", label: "Proposal expired" },
  PROPOSAL_SUPERSEDED: { type: "PROPOSAL_SUPERSEDED", label: "Proposal superseded" },
  PROPOSAL_ARCHIVED: { type: "PROPOSAL_ARCHIVED", label: "Proposal archived" }
};

export function projectTimeline(state: ProposalState): readonly ProposalTimelineItemReadModel[] {
  return state.events.map((event, sequence) => {
    const base = timelineBase[event.eventType];
    const supersedes = metadataString(event.metadata, "supersedesProposalId");
    const replacement = metadataString(event.metadata, "replacementProposalId");
    const submissionMethod = metadataString(event.metadata, "submissionMethod");
    const type = event.eventType === "PROPOSAL_CREATED" && supersedes
      ? "REPLACEMENT_CREATED"
      : event.eventType === "PROPOSAL_SUBMITTED" && submissionMethod === "EXECUTIVE_AUTHORIZATION"
        ? "SUBMITTED_EXECUTIVE_AUTHORIZATION"
        : base.type;
    return {
      sequence,
      item: {
        id: event.eventId,
        type,
        occurredAt: event.occurredAt,
        actorUserId: event.responsibleUserId,
        label: type === "REPLACEMENT_CREATED" ? "Replacement Proposal created" : base.label,
        summary: event.displaySummary,
        versionId: metadataString(event.metadata, "proposalVersionId"),
        relatedProposalId: replacement ?? supersedes,
        agreementId: null
      }
    };
  }).sort((left, right) => left.item.occurredAt.localeCompare(right.item.occurredAt) || left.sequence - right.sequence).map(({ item }) => item);
}

function has(capabilities: ReadonlySet<ProposalCapability>, capability: ProposalCapability) {
  return capabilities.has(capability);
}

export function projectPermittedActions(
  state: ProposalState,
  actor: ProposalActorContext,
  capabilities: ReadonlySet<ProposalCapability>
): ProposalPermittedActionsReadModel {
  if (!actor.active || actor.companyId !== state.companyId) {
    return {
      generateRepresentation: false,
      createDelivery: false,
      attachPricingVersion: false,
      updateDraft: false,
      saveVersion: false,
      requestQualityReview: false,
      submitForExecutiveAuthorization: false,
      approve: false,
      reject: false,
      requestChanges: false,
      submitThroughQualityReview: false,
      submitThroughExecutiveAuthorization: false,
      recordViewed: false,
      recordClientAcceptance: false,
      recordVerbalAcceptance: false,
      withdrawAcceptance: false,
      linkExecutedAgreement: false,
      decline: false,
      expire: false,
      createReplacement: false,
      supersede: false,
      archive: false
    };
  }
  const draft = state.status === "DRAFT";
  const review = state.status === "INTERNAL_REVIEW";
  const clientDecision = state.status === "SUBMITTED" || state.status === "VIEWED";
  const currentVersion = state.versions.find(({ versionId }) => versionId === state.currentVersionId);
  const currentVersionRepresentsWorkingDraft = state.currentVersionId !== null && state.versionDraftRevision === state.draftRevision;
  const independentReviewer = Boolean(currentVersion && currentVersion.createdByUserId !== actor.userId);
  const replaceable = ["SUBMITTED", "VIEWED", "ACCEPTED"].includes(state.status) && !state.executedAgreementId;
  return {
    generateRepresentation: state.versions.length > 0 && has(capabilities, PROPOSAL_CAPABILITIES.GENERATE_REPRESENTATION),
    createDelivery: state.versions.length > 0 && has(capabilities, PROPOSAL_CAPABILITIES.CREATE_DELIVERY),
    attachPricingVersion: draft && has(capabilities, PROPOSAL_CAPABILITIES.EDIT_DRAFT),
    updateDraft: draft && has(capabilities, PROPOSAL_CAPABILITIES.EDIT_DRAFT),
    saveVersion: draft && has(capabilities, PROPOSAL_CAPABILITIES.SAVE_VERSION),
    requestQualityReview: draft && currentVersionRepresentsWorkingDraft && has(capabilities, PROPOSAL_CAPABILITIES.REQUEST_REVIEW),
    submitForExecutiveAuthorization: review && independentReviewer && currentVersionRepresentsWorkingDraft && has(capabilities, PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE),
    approve: state.status === "EXECUTIVE_AUTHORIZATION" && has(capabilities, PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE),
    reject: (review || state.status === "EXECUTIVE_AUTHORIZATION") && independentReviewer && has(capabilities, PROPOSAL_CAPABILITIES.QUALITY_REVIEW),
    requestChanges: review && currentVersionRepresentsWorkingDraft && independentReviewer && has(capabilities, PROPOSAL_CAPABILITIES.QUALITY_REVIEW),
    submitThroughQualityReview: review && currentVersionRepresentsWorkingDraft && independentReviewer && has(capabilities, PROPOSAL_CAPABILITIES.QUALITY_REVIEW),
    submitThroughExecutiveAuthorization: draft && currentVersionRepresentsWorkingDraft && has(capabilities, PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE),
    recordViewed: state.status === "SUBMITTED" && has(capabilities, PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY),
    recordClientAcceptance: clientDecision && has(capabilities, PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY),
    recordVerbalAcceptance: clientDecision && has(capabilities, PROPOSAL_CAPABILITIES.MANAGE_ACCEPTANCE),
    withdrawAcceptance: state.status === "ACCEPTED" && Boolean(state.currentAcceptanceId) && !state.executedAgreementId && has(capabilities, PROPOSAL_CAPABILITIES.MANAGE_ACCEPTANCE),
    linkExecutedAgreement: state.status === "ACCEPTED" && !state.executedAgreementId && has(capabilities, PROPOSAL_CAPABILITIES.LINK_AGREEMENT),
    decline: clientDecision && has(capabilities, PROPOSAL_CAPABILITIES.RECORD_CLIENT_ACTIVITY),
    expire: clientDecision && has(capabilities, PROPOSAL_CAPABILITIES.MANAGE_LIFECYCLE),
    createReplacement: replaceable && has(capabilities, PROPOSAL_CAPABILITIES.CREATE_REPLACEMENT),
    supersede: replaceable && has(capabilities, PROPOSAL_CAPABILITIES.SUPERSEDE),
    archive: ["DRAFT", "INTERNAL_REVIEW", "APPROVED", "REJECTED", "DECLINED", "EXPIRED", "SUPERSEDED", "ACCEPTED"].includes(state.status) && has(capabilities, PROPOSAL_CAPABILITIES.ARCHIVE)
  };
}
