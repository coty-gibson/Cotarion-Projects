import {
  PROPOSAL_CONTENT_SCHEMA_VERSION,
  PROPOSAL_CONTRACT_VERSION,
  type JsonObject,
  type ProposalBusinessEventV1,
  type ProposalPricingSnapshot,
  type ProposalStatus,
  type ProposalStructuredContentV1,
  isValidMajorRecordNumber
} from "@/domain/proposals/contracts";
import type { EngagementTypePolicyV1 } from "@/domain/proposals/engagement-type-policies";

export type ProposalDomainErrorCode =
  | "IDENTITY_INVALID"
  | "COMPANY_MISMATCH"
  | "CLIENT_MISMATCH"
  | "PRICING_SOURCE_INELIGIBLE"
  | "PRICING_MODEL_INCOMPATIBLE"
  | "EXPIRATION_INVALID"
  | "EXPIRATION_OVERRIDE_REASON_REQUIRED"
  | "DRAFT_NOT_EDITABLE"
  | "VERSION_REQUIRED"
  | "VERSION_STALE"
  | "REVIEW_TRANSITION_INVALID"
  | "SUBMISSION_NOT_AUTHORIZED"
  | "SUBMISSION_TRANSITION_INVALID"
  | "AUTHORIZED_RECIPIENT_REQUIRED"
  | "RECIPIENT_NOT_AUTHORIZED"
  | "DECISION_TRANSITION_INVALID"
  | "ACCEPTANCE_EVIDENCE_REQUIRED"
  | "ACCEPTANCE_WITHDRAWAL_PROHIBITED"
  | "AGREEMENT_LINK_INVALID"
  | "SUPERSESSION_INVALID"
  | "ARCHIVE_INVALID";

export class ProposalDomainError extends Error {
  constructor(
    readonly code: ProposalDomainErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ProposalDomainError";
  }
}

export interface ProposalCommandContext {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly responsibleUserId: string;
}

export interface ProposalRecipient {
  readonly recipientId: string;
  readonly contactId: string | null;
  readonly name: string;
  readonly email: string;
  readonly authorizedToAccept: boolean;
}

export interface ProposalCommercialTerms {
  readonly paymentSchedule: string;
  readonly billingMethod: string;
  readonly depositTerms: string;
  readonly recurrenceAndTerm: string;
  readonly cancellationSummary: string;
  readonly assumptionsAndExclusions: string;
  readonly clientResponsibilities: string;
  readonly offerNotes: string;
}

export interface ProposalWorkingDraft {
  readonly title: string;
  readonly engagementTypeCode: EngagementTypePolicyV1["code"];
  readonly engagementTypePolicyVersion: number;
  readonly expirationAt: string;
  readonly expirationOverrideReason: string | null;
  readonly content: ProposalStructuredContentV1;
  readonly commercialTerms: ProposalCommercialTerms;
  readonly recipients: readonly ProposalRecipient[];
}

export interface ProposalVersion {
  readonly versionId: string;
  readonly proposalId: string;
  readonly versionNumber: number;
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly predecessorVersionId: string | null;
  readonly revisionReason: string | null;
  readonly draft: ProposalWorkingDraft;
  readonly pricingSnapshot: ProposalPricingSnapshot;
}

export interface ProposalAcceptance {
  readonly acceptanceId: string;
  readonly proposalVersionId: string;
  readonly acceptedAt: string;
  readonly acceptedFromStatus: "SUBMITTED" | "VIEWED";
  readonly channel: "CLIENT_RECORDED" | "VERBAL_RECORDED";
  readonly recipientId: string;
  readonly responsibleUserId: string | null;
  readonly reason: string | null;
  readonly notes: string;
}

export interface ProposalAcceptanceWithdrawal {
  readonly withdrawalId: string;
  readonly acceptanceId: string;
  readonly withdrawnAt: string;
  readonly responsibleUserId: string;
  readonly reason: string;
}

export interface ProposalState {
  readonly contractVersion: typeof PROPOSAL_CONTRACT_VERSION;
  readonly id: string;
  readonly proposalNumber: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly ownerId: string;
  readonly operatingGroupCode: "CONSULTING";
  readonly engagementTypeCode: EngagementTypePolicyV1["code"];
  readonly engagementTypePolicyVersion: number;
  readonly pricingSnapshot: ProposalPricingSnapshot;
  readonly status: ProposalStatus;
  readonly createdAt: string;
  readonly effectiveAt: string | null;
  readonly closedAt: string | null;
  readonly updatedAt: string;
  readonly workingDraft: ProposalWorkingDraft;
  readonly versions: readonly ProposalVersion[];
  readonly currentVersionId: string | null;
  readonly submittedVersionId: string | null;
  readonly revisionOpen: boolean;
  readonly acceptances: readonly ProposalAcceptance[];
  readonly currentAcceptanceId: string | null;
  readonly acceptanceWithdrawals: readonly ProposalAcceptanceWithdrawal[];
  readonly executedAgreementId: string | null;
  readonly supersededByProposalId: string | null;
  readonly events: readonly ProposalBusinessEventV1[];
}

export interface CreateProposalInput {
  readonly id: string;
  readonly proposalNumber: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly ownerId: string;
  readonly engagementTypePolicy: EngagementTypePolicyV1;
  readonly pricingSnapshot: ProposalPricingSnapshot;
  readonly title: string;
  readonly expirationAt?: string;
  readonly expirationOverrideReason?: string;
}

export interface SaveProposalVersionInput {
  readonly versionId: string;
  readonly revisionReason?: string;
}

interface MutableProposalState {
  contractVersion: typeof PROPOSAL_CONTRACT_VERSION;
  id: string;
  proposalNumber: string;
  companyId: string;
  clientId: string;
  ownerId: string;
  operatingGroupCode: "CONSULTING";
  engagementTypeCode: EngagementTypePolicyV1["code"];
  engagementTypePolicyVersion: number;
  pricingSnapshot: ProposalPricingSnapshot;
  status: ProposalStatus;
  createdAt: string;
  effectiveAt: string | null;
  closedAt: string | null;
  updatedAt: string;
  workingDraft: ProposalWorkingDraft;
  draftRevision: number;
  versionDraftRevision: number | null;
  versions: ProposalVersion[];
  currentVersionId: string | null;
  submittedVersionId: string | null;
  revisionOpen: boolean;
  acceptances: ProposalAcceptance[];
  currentAcceptanceId: string | null;
  acceptanceWithdrawals: ProposalAcceptanceWithdrawal[];
  executedAgreementId: string | null;
  supersededByProposalId: string | null;
  events: ProposalBusinessEventV1[];
}

const EMPTY_TERMS: ProposalCommercialTerms = {
  paymentSchedule: "",
  billingMethod: "",
  depositTerms: "",
  recurrenceAndTerm: "",
  cancellationSummary: "",
  assumptionsAndExclusions: "",
  clientResponsibilities: "",
  offerNotes: ""
};

function requireText(value: string, message: string) {
  if (!value.trim()) throw new ProposalDomainError("IDENTITY_INVALID", message);
  return value.trim();
}

function validDate(value: string, code: ProposalDomainErrorCode, message: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new ProposalDomainError(code, message);
  return timestamp;
}

function addDays(iso: string, days: number) {
  return new Date(
    validDate(iso, "IDENTITY_INVALID", "Command timestamp is invalid.") + days * 864e5
  ).toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function eventMetadata(value: JsonObject) {
  return value;
}

export class ProposalAggregate {
  private constructor(
    private readonly stateValue: MutableProposalState,
    private readonly engagementPolicy: EngagementTypePolicyV1
  ) {}

  static create(input: CreateProposalInput, context: ProposalCommandContext) {
    requireText(context.eventId, "Event identity is required.");
    requireText(context.responsibleUserId, "Responsible user identity is required.");
    const createdAt = new Date(
      validDate(context.occurredAt, "IDENTITY_INVALID", "Created timestamp is invalid.")
    ).toISOString();
    if (!isValidMajorRecordNumber("PROPOSAL", input.proposalNumber)) {
      throw new ProposalDomainError(
        "IDENTITY_INVALID",
        "Proposal number must use the permanent PRO-###### format."
      );
    }
    requireText(input.id, "Proposal identity is required.");
    requireText(input.companyId, "Company identity is required.");
    requireText(input.clientId, "Client identity is required.");
    requireText(input.ownerId, "Owner identity is required.");
    if (input.pricingSnapshot.companyId !== input.companyId) {
      throw new ProposalDomainError(
        "COMPANY_MISMATCH",
        "Pricing Project and Proposal must belong to the same Company."
      );
    }
    if (input.pricingSnapshot.clientId !== input.clientId) {
      throw new ProposalDomainError(
        "CLIENT_MISMATCH",
        "Pricing Project and Proposal must belong to the same Client."
      );
    }
    if (
      input.pricingSnapshot.operatingGroupCode !== "CONSULTING" ||
      input.pricingSnapshot.sourceStatus !== "QUOTED"
    ) {
      throw new ProposalDomainError(
        "PRICING_SOURCE_INELIGIBLE",
        "Proposal requires one quoted Cotarion Consulting Group Pricing Project."
      );
    }
    if (
      !input.engagementTypePolicy.allowedPricingModels.includes(input.pricingSnapshot.pricingModel)
    ) {
      throw new ProposalDomainError(
        "PRICING_MODEL_INCOMPATIBLE",
        "Pricing Model is not allowed for the selected Engagement Type."
      );
    }

    const expirationAt = input.expirationAt
      ? new Date(
          validDate(input.expirationAt, "EXPIRATION_INVALID", "Expiration date is invalid.")
        ).toISOString()
      : addDays(createdAt, 30);
    if (Date.parse(expirationAt) <= Date.parse(createdAt)) {
      throw new ProposalDomainError(
        "EXPIRATION_INVALID",
        "Proposal expiration must be after its Created Date."
      );
    }
    const expirationOverrideReason = input.expirationAt
      ? input.expirationOverrideReason?.trim() || null
      : null;
    if (input.expirationAt && !expirationOverrideReason) {
      throw new ProposalDomainError(
        "EXPIRATION_OVERRIDE_REASON_REQUIRED",
        "Changing the default 30-day expiration requires a reason."
      );
    }

    const state: MutableProposalState = {
      contractVersion: PROPOSAL_CONTRACT_VERSION,
      id: input.id,
      proposalNumber: input.proposalNumber,
      companyId: input.companyId,
      clientId: input.clientId,
      ownerId: input.ownerId,
      operatingGroupCode: "CONSULTING",
      engagementTypeCode: input.engagementTypePolicy.code,
      engagementTypePolicyVersion: input.engagementTypePolicy.policyVersion,
      pricingSnapshot: deepFreeze(clone(input.pricingSnapshot)),
      status: "DRAFT",
      createdAt,
      effectiveAt: null,
      closedAt: null,
      updatedAt: createdAt,
      workingDraft: deepFreeze({
        title: requireText(input.title, "Proposal title is required."),
        engagementTypeCode: input.engagementTypePolicy.code,
        engagementTypePolicyVersion: input.engagementTypePolicy.policyVersion,
        expirationAt,
        expirationOverrideReason,
        content: {
          schemaVersion: PROPOSAL_CONTENT_SCHEMA_VERSION,
          title: input.title.trim(),
          sections: []
        },
        commercialTerms: EMPTY_TERMS,
        recipients: []
      }),
      draftRevision: 1,
      versionDraftRevision: null,
      versions: [],
      currentVersionId: null,
      submittedVersionId: null,
      revisionOpen: false,
      acceptances: [],
      currentAcceptanceId: null,
      acceptanceWithdrawals: [],
      executedAgreementId: null,
      supersededByProposalId: null,
      events: []
    };
    const aggregate = new ProposalAggregate(state, deepFreeze(clone(input.engagementTypePolicy)));
    aggregate.recordEvent("PROPOSAL_CREATED", context, "Proposal created.", {});
    return aggregate;
  }

  get state(): ProposalState {
    return deepFreeze(
      clone({
        ...this.stateValue,
        draftRevision: undefined,
        versionDraftRevision: undefined
      })
    ) as unknown as ProposalState;
  }

  updateDraft(
    update: Partial<
      Pick<
        ProposalWorkingDraft,
        "title" | "content" | "commercialTerms" | "recipients" | "expirationAt"
      >
    > & { expirationOverrideReason?: string | null },
    occurredAt: string
  ) {
    this.assertTimestampNotBeforeUpdated(occurredAt);
    this.requireDraftEditable();
    const nextExpiration = update.expirationAt ?? this.stateValue.workingDraft.expirationAt;
    validDate(nextExpiration, "EXPIRATION_INVALID", "Expiration date is invalid.");
    if (Date.parse(nextExpiration) <= Date.parse(this.stateValue.createdAt)) {
      throw new ProposalDomainError(
        "EXPIRATION_INVALID",
        "Proposal expiration must be after its Created Date."
      );
    }
    const changedExpiration = nextExpiration !== this.stateValue.workingDraft.expirationAt;
    const overrideReason =
      update.expirationOverrideReason === undefined
        ? this.stateValue.workingDraft.expirationOverrideReason
        : update.expirationOverrideReason?.trim() || null;
    if (changedExpiration && !overrideReason) {
      throw new ProposalDomainError(
        "EXPIRATION_OVERRIDE_REASON_REQUIRED",
        "Changing Proposal expiration requires a reason."
      );
    }
    this.stateValue.workingDraft = deepFreeze({
      ...clone(this.stateValue.workingDraft),
      ...clone(update),
      title: update.title
        ? requireText(update.title, "Proposal title is required.")
        : this.stateValue.workingDraft.title,
      expirationAt: nextExpiration,
      expirationOverrideReason: overrideReason
    });
    this.stateValue.draftRevision += 1;
    this.touch(occurredAt);
  }

  beginRevision(occurredAt: string) {
    this.assertTimestampNotBeforeUpdated(occurredAt);
    if (
      !["SUBMITTED", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED"].includes(
        this.stateValue.status
      ) ||
      !this.currentVersion()
    ) {
      throw new ProposalDomainError(
        "DRAFT_NOT_EDITABLE",
        "Only a versioned Proposal may begin a revision."
      );
    }
    if (this.stateValue.executedAgreementId) {
      throw new ProposalDomainError(
        "DRAFT_NOT_EDITABLE",
        "An executed Agreement prevents Proposal revision."
      );
    }
    this.stateValue.workingDraft = deepFreeze(clone(this.currentVersion()!.draft));
    this.stateValue.revisionOpen = true;
    this.stateValue.draftRevision += 1;
    this.stateValue.versionDraftRevision = null;
    this.touch(occurredAt);
  }

  saveVersion(input: SaveProposalVersionInput, context: ProposalCommandContext) {
    this.assertEventContext(context);
    this.requireDraftEditable();
    requireText(input.versionId, "Proposal Version identity is required.");
    if (this.stateValue.versions.some(({ versionId }) => versionId === input.versionId)) {
      throw new ProposalDomainError(
        "IDENTITY_INVALID",
        "Proposal Version identity must be unique."
      );
    }
    const version: ProposalVersion = deepFreeze({
      versionId: input.versionId,
      proposalId: this.stateValue.id,
      versionNumber: this.stateValue.versions.length + 1,
      createdAt: new Date(
        validDate(context.occurredAt, "IDENTITY_INVALID", "Version timestamp is invalid.")
      ).toISOString(),
      createdByUserId: context.responsibleUserId,
      predecessorVersionId: this.stateValue.currentVersionId,
      revisionReason: input.revisionReason?.trim() || null,
      draft: clone(this.stateValue.workingDraft),
      pricingSnapshot: clone(this.stateValue.pricingSnapshot)
    });
    this.stateValue.versions.push(version);
    this.stateValue.currentVersionId = version.versionId;
    this.stateValue.versionDraftRevision = this.stateValue.draftRevision;
    this.recordEvent(
      "PROPOSAL_VERSION_SAVED",
      context,
      `Proposal Version ${version.versionNumber} saved.`,
      eventMetadata({ proposalVersionId: version.versionId, versionNumber: version.versionNumber })
    );
    return version;
  }

  requestInternalReview(context: ProposalCommandContext) {
    this.assertEventContext(context);
    this.requireCurrentVersion();
    if (this.stateValue.status !== "DRAFT" && !this.stateValue.revisionOpen) {
      throw new ProposalDomainError(
        "REVIEW_TRANSITION_INVALID",
        "Only an editable Proposal may enter Internal Review."
      );
    }
    this.stateValue.status = "INTERNAL_REVIEW";
    this.recordEvent(
      "PROPOSAL_INTERNAL_REVIEW_REQUESTED",
      context,
      "Proposal submitted for Internal Review.",
      {}
    );
  }

  requestChanges(context: ProposalCommandContext) {
    this.assertEventContext(context);
    if (this.stateValue.status !== "INTERNAL_REVIEW") {
      throw new ProposalDomainError(
        "REVIEW_TRANSITION_INVALID",
        "Changes can be requested only during Internal Review."
      );
    }
    this.stateValue.status = "DRAFT";
    this.stateValue.revisionOpen = true;
    this.recordEvent("PROPOSAL_CHANGES_REQUESTED", context, "Proposal changes requested.", {});
  }

  submit(context: ProposalCommandContext, canBypassInternalReview: boolean) {
    this.assertEventContext(context);
    const version = this.requireCurrentVersion();
    const reviewed = this.stateValue.status === "INTERNAL_REVIEW";
    const directSubmission =
      canBypassInternalReview &&
      (this.stateValue.status === "DRAFT" ||
        this.stateValue.revisionOpen ||
        ["SUBMITTED", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED"].includes(
          this.stateValue.status
        ));
    if (!reviewed && !directSubmission) {
      throw new ProposalDomainError(
        canBypassInternalReview ? "SUBMISSION_TRANSITION_INVALID" : "SUBMISSION_NOT_AUTHORIZED",
        "Proposal must complete Internal Review unless the actor may bypass it."
      );
    }
    if (this.stateValue.versionDraftRevision !== this.stateValue.draftRevision) {
      throw new ProposalDomainError(
        "VERSION_STALE",
        "Save an immutable Proposal Version after the latest Draft changes."
      );
    }
    if (!version.draft.recipients.some(({ authorizedToAccept }) => authorizedToAccept)) {
      throw new ProposalDomainError(
        "AUTHORIZED_RECIPIENT_REQUIRED",
        "Submission requires at least one authorized recipient."
      );
    }
    if (Date.parse(version.draft.expirationAt) <= Date.parse(context.occurredAt)) {
      throw new ProposalDomainError(
        "EXPIRATION_INVALID",
        "An expired Proposal Version cannot be submitted."
      );
    }
    if (this.stateValue.status === "ACCEPTED" && this.stateValue.executedAgreementId) {
      throw new ProposalDomainError(
        "SUBMISSION_TRANSITION_INVALID",
        "An accepted Proposal with an executed Agreement cannot be replaced."
      );
    }

    const priorSubmittedVersionId = this.stateValue.submittedVersionId;
    this.stateValue.submittedVersionId = version.versionId;
    this.stateValue.status = "SUBMITTED";
    this.stateValue.effectiveAt = context.occurredAt;
    this.stateValue.closedAt = null;
    this.stateValue.revisionOpen = false;
    this.stateValue.currentAcceptanceId = null;
    this.stateValue.executedAgreementId = null;
    this.recordEvent(
      "PROPOSAL_SUBMITTED",
      context,
      `Proposal Version ${version.versionNumber} submitted.`,
      eventMetadata({
        proposalVersionId: version.versionId,
        priorSubmittedVersionId
      })
    );
  }

  recordViewed(context: ProposalCommandContext) {
    this.assertEventContext(context);
    if (this.stateValue.status !== "SUBMITTED") {
      throw new ProposalDomainError(
        "DECISION_TRANSITION_INVALID",
        "Only a submitted Proposal can be marked Viewed."
      );
    }
    this.stateValue.status = "VIEWED";
    this.recordEvent("PROPOSAL_VIEWED", context, "Proposal viewed by Client.", {});
  }

  acceptByRecipient(
    input: { acceptanceId: string; recipientId: string; notes?: string },
    context: ProposalCommandContext
  ) {
    this.accept(
      {
        acceptanceId: input.acceptanceId,
        recipientId: input.recipientId,
        channel: "CLIENT_RECORDED",
        reason: null,
        notes: input.notes?.trim() ?? "",
        responsibleUserId: null
      },
      context
    );
  }

  recordVerbalAcceptance(
    input: { acceptanceId: string; recipientId: string; reason: string; notes: string },
    context: ProposalCommandContext
  ) {
    if (!input.reason.trim() || !input.notes.trim() || !context.responsibleUserId.trim()) {
      throw new ProposalDomainError(
        "ACCEPTANCE_EVIDENCE_REQUIRED",
        "Verbal acceptance requires responsible user, reason, and notes."
      );
    }
    this.accept(
      {
        acceptanceId: input.acceptanceId,
        recipientId: input.recipientId,
        channel: "VERBAL_RECORDED",
        reason: input.reason.trim(),
        notes: input.notes.trim(),
        responsibleUserId: context.responsibleUserId
      },
      context
    );
  }

  withdrawAcceptance(
    input: { withdrawalId: string; reason: string },
    context: ProposalCommandContext
  ) {
    this.assertEventContext(context);
    const acceptance = this.currentAcceptance();
    if (this.stateValue.status !== "ACCEPTED" || !acceptance) {
      throw new ProposalDomainError(
        "ACCEPTANCE_WITHDRAWAL_PROHIBITED",
        "Only an accepted Proposal can withdraw acceptance."
      );
    }
    if (this.stateValue.executedAgreementId) {
      throw new ProposalDomainError(
        "ACCEPTANCE_WITHDRAWAL_PROHIBITED",
        "Acceptance cannot be withdrawn after Service Agreement execution."
      );
    }
    const reason = input.reason.trim();
    if (!reason) {
      throw new ProposalDomainError(
        "ACCEPTANCE_EVIDENCE_REQUIRED",
        "Acceptance withdrawal requires a reason."
      );
    }
    this.stateValue.acceptanceWithdrawals.push(
      deepFreeze({
        withdrawalId: requireText(input.withdrawalId, "Withdrawal identity is required."),
        acceptanceId: acceptance.acceptanceId,
        withdrawnAt: context.occurredAt,
        responsibleUserId: context.responsibleUserId,
        reason
      })
    );
    this.stateValue.status = acceptance.acceptedFromStatus;
    this.stateValue.currentAcceptanceId = null;
    this.recordEvent(
      "PROPOSAL_ACCEPTANCE_WITHDRAWN",
      context,
      "Proposal acceptance withdrawn.",
      eventMetadata({ acceptanceId: acceptance.acceptanceId, reason })
    );
  }

  linkExecutedAgreement(agreementId: string, occurredAt: string) {
    this.assertTimestampNotBeforeUpdated(occurredAt);
    if (this.stateValue.status !== "ACCEPTED") {
      throw new ProposalDomainError(
        "AGREEMENT_LINK_INVALID",
        "An executed Agreement can be linked only to an accepted Proposal."
      );
    }
    this.stateValue.executedAgreementId = requireText(
      agreementId,
      "Executed Agreement identity is required."
    );
    this.touch(occurredAt);
  }

  decline(context: ProposalCommandContext) {
    this.assertEventContext(context);
    this.requireClientDecisionState();
    this.stateValue.status = "DECLINED";
    this.stateValue.closedAt = context.occurredAt;
    this.recordEvent("PROPOSAL_DECLINED", context, "Proposal declined.", {});
  }

  expire(context: ProposalCommandContext) {
    this.assertEventContext(context);
    this.requireClientDecisionState();
    const version = this.submittedVersion();
    if (Date.parse(context.occurredAt) < Date.parse(version.draft.expirationAt)) {
      throw new ProposalDomainError(
        "EXPIRATION_INVALID",
        "Proposal cannot expire before its expiration date."
      );
    }
    this.stateValue.status = "EXPIRED";
    this.stateValue.closedAt = context.occurredAt;
    this.recordEvent("PROPOSAL_EXPIRED", context, "Proposal expired.", {});
  }

  supersede(replacementProposalId: string, context: ProposalCommandContext) {
    this.assertEventContext(context);
    if (!["SUBMITTED", "VIEWED", "ACCEPTED"].includes(this.stateValue.status)) {
      throw new ProposalDomainError(
        "SUPERSESSION_INVALID",
        "Only a submitted, viewed, or accepted Proposal can be superseded."
      );
    }
    if (this.stateValue.executedAgreementId) {
      throw new ProposalDomainError(
        "SUPERSESSION_INVALID",
        "A Proposal with an executed Agreement cannot be superseded."
      );
    }
    this.stateValue.supersededByProposalId = requireText(
      replacementProposalId,
      "Replacement Proposal identity is required."
    );
    this.stateValue.status = "SUPERSEDED";
    this.stateValue.currentAcceptanceId = null;
    this.stateValue.closedAt = context.occurredAt;
    this.recordEvent(
      "PROPOSAL_SUPERSEDED",
      context,
      "Proposal superseded by a replacement offer.",
      eventMetadata({ replacementProposalId })
    );
  }

  archive(context: ProposalCommandContext) {
    this.assertEventContext(context);
    if (
      !["DRAFT", "INTERNAL_REVIEW", "DECLINED", "EXPIRED", "SUPERSEDED", "ACCEPTED"].includes(
        this.stateValue.status
      )
    ) {
      throw new ProposalDomainError(
        "ARCHIVE_INVALID",
        "Proposal cannot be archived from its current state."
      );
    }
    this.stateValue.status = "ARCHIVED";
    this.stateValue.closedAt ??= context.occurredAt;
    this.recordEvent("PROPOSAL_ARCHIVED", context, "Proposal archived.", {});
  }

  private accept(
    input: {
      acceptanceId: string;
      recipientId: string;
      channel: ProposalAcceptance["channel"];
      reason: string | null;
      notes: string;
      responsibleUserId: string | null;
    },
    context: ProposalCommandContext
  ) {
    this.assertEventContext(context);
    this.requireClientDecisionState();
    const version = this.submittedVersion();
    const recipient = version.draft.recipients.find(
      ({ recipientId }) => recipientId === input.recipientId
    );
    if (!recipient?.authorizedToAccept) {
      throw new ProposalDomainError(
        "RECIPIENT_NOT_AUTHORIZED",
        "Proposal acceptance must come from an authorized recipient."
      );
    }
    const acceptedFromStatus = this.stateValue.status as "SUBMITTED" | "VIEWED";
    const acceptance = deepFreeze({
      acceptanceId: requireText(input.acceptanceId, "Acceptance identity is required."),
      proposalVersionId: version.versionId,
      acceptedAt: context.occurredAt,
      acceptedFromStatus,
      channel: input.channel,
      recipientId: input.recipientId,
      responsibleUserId: input.responsibleUserId,
      reason: input.reason,
      notes: input.notes
    });
    if (
      this.stateValue.acceptances.some(
        ({ acceptanceId }) => acceptanceId === acceptance.acceptanceId
      )
    ) {
      throw new ProposalDomainError(
        "IDENTITY_INVALID",
        "Proposal Acceptance identity must be unique."
      );
    }
    this.stateValue.acceptances.push(acceptance);
    this.stateValue.currentAcceptanceId = acceptance.acceptanceId;
    this.stateValue.status = "ACCEPTED";
    this.recordEvent(
      input.channel === "VERBAL_RECORDED"
        ? "PROPOSAL_VERBAL_ACCEPTANCE_RECORDED"
        : "PROPOSAL_ACCEPTED",
      context,
      input.channel === "VERBAL_RECORDED"
        ? "Verbal Proposal acceptance recorded."
        : "Proposal accepted by Client.",
      eventMetadata({
        acceptanceId: acceptance.acceptanceId,
        proposalVersionId: version.versionId,
        recipientId: input.recipientId
      })
    );
  }

  private requireDraftEditable() {
    if (
      this.stateValue.status === "ARCHIVED" ||
      this.stateValue.status === "SUPERSEDED" ||
      (this.stateValue.status !== "DRAFT" && !this.stateValue.revisionOpen)
    ) {
      throw new ProposalDomainError(
        "DRAFT_NOT_EDITABLE",
        "Proposal Draft is not editable in its current state."
      );
    }
  }

  private requireCurrentVersion() {
    const version = this.currentVersion();
    if (!version) {
      throw new ProposalDomainError(
        "VERSION_REQUIRED",
        "Save an immutable Proposal Version before this action."
      );
    }
    if (this.stateValue.versionDraftRevision !== this.stateValue.draftRevision) {
      throw new ProposalDomainError(
        "VERSION_STALE",
        "Save a new Proposal Version after Draft changes."
      );
    }
    return version;
  }

  private currentVersion() {
    return (
      this.stateValue.versions.find(
        ({ versionId }) => versionId === this.stateValue.currentVersionId
      ) ?? null
    );
  }

  private submittedVersion() {
    const version = this.stateValue.versions.find(
      ({ versionId }) => versionId === this.stateValue.submittedVersionId
    );
    if (!version) {
      throw new ProposalDomainError(
        "VERSION_REQUIRED",
        "Submitted Proposal Version is unavailable."
      );
    }
    return version;
  }

  private currentAcceptance() {
    return (
      this.stateValue.acceptances.find(
        ({ acceptanceId }) => acceptanceId === this.stateValue.currentAcceptanceId
      ) ?? null
    );
  }

  private requireClientDecisionState() {
    if (this.stateValue.status !== "SUBMITTED" && this.stateValue.status !== "VIEWED") {
      throw new ProposalDomainError(
        "DECISION_TRANSITION_INVALID",
        "Client decision requires a submitted or viewed Proposal."
      );
    }
  }

  private recordEvent(
    eventType: ProposalBusinessEventV1["eventType"],
    context: ProposalCommandContext,
    displaySummary: string,
    metadata: JsonObject
  ) {
    this.assertEventContext(context);
    const event: ProposalBusinessEventV1 = deepFreeze({
      eventSchemaVersion: 1,
      eventId: context.eventId,
      occurredAt: context.occurredAt,
      publishedAt: context.occurredAt,
      companyId: this.stateValue.companyId,
      clientId: this.stateValue.clientId,
      eventType,
      sourceAggregateType: "PROPOSAL",
      sourceRecordId: this.stateValue.id,
      sourceReferenceNumber: this.stateValue.proposalNumber,
      displaySummary,
      responsibleUserId: context.responsibleUserId,
      operatingGroupId: this.stateValue.operatingGroupCode,
      engagementId: null,
      actorType: "USER",
      correlationId: null,
      causationId: null,
      metadata
    });
    this.stateValue.events.push(event);
    this.touch(context.occurredAt);
  }

  private touch(occurredAt: string) {
    validDate(occurredAt, "IDENTITY_INVALID", "Updated timestamp is invalid.");
    this.stateValue.updatedAt = occurredAt;
  }

  private assertEventContext(context: ProposalCommandContext) {
    requireText(context.eventId, "Event identity is required.");
    requireText(context.responsibleUserId, "Responsible user identity is required.");
    validDate(context.occurredAt, "IDENTITY_INVALID", "Event timestamp is invalid.");
    this.assertTimestampNotBeforeUpdated(context.occurredAt);
    if (this.stateValue.events.some(({ eventId }) => eventId === context.eventId)) {
      throw new ProposalDomainError("IDENTITY_INVALID", "Event identity must be unique.");
    }
  }

  private assertTimestampNotBeforeUpdated(occurredAt: string) {
    const timestamp = validDate(
      occurredAt,
      "IDENTITY_INVALID",
      "Business-event timestamp is invalid."
    );
    if (timestamp < Date.parse(this.stateValue.updatedAt)) {
      throw new ProposalDomainError(
        "IDENTITY_INVALID",
        "Business events cannot be recorded before the latest aggregate update."
      );
    }
  }
}
