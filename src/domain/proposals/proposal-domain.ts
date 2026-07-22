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
import {
  ProposalNumber,
  ProposalTitle,
  ProposalValueError,
  ProposalVersionNumber,
  type ProposalVersionStatus
} from "@/domain/proposals/proposal-value-objects";

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
  | "REVIEWER_NOT_INDEPENDENT"
  | "BUSINESS_JUSTIFICATION_REQUIRED"
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
  readonly draftRevision: number;
  readonly versionDraftRevision: number | null;
  readonly versions: readonly ProposalVersion[];
  readonly currentVersionId: string | null;
  readonly submittedVersionId: string | null;
  readonly qualityReviewRequestedByUserId: string | null;
  readonly revisionOpen: boolean;
  readonly acceptances: readonly ProposalAcceptance[];
  readonly currentAcceptanceId: string | null;
  readonly acceptanceWithdrawals: readonly ProposalAcceptanceWithdrawal[];
  readonly executedAgreementId: string | null;
  readonly supersededByProposalId: string | null;
  readonly supersedesProposalId: string | null;
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

export type ProposalSubmissionAuthorization =
  | { readonly method: "QUALITY_REVIEW"; readonly reviewerUserId: string }
  | {
      readonly method: "EXECUTIVE_AUTHORIZATION";
      readonly authorizedByUserId: string;
      readonly businessJustification: string;
    };

export interface CreateReplacementProposalInput {
  readonly id: string;
  readonly proposalNumber: string;
  readonly ownerId: string;
  readonly pricingSnapshot?: ProposalPricingSnapshot;
  readonly title?: string;
  readonly expirationAt?: string;
  readonly expirationOverrideReason?: string;
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
  qualityReviewRequestedByUserId: string | null;
  revisionOpen: boolean;
  acceptances: ProposalAcceptance[];
  currentAcceptanceId: string | null;
  acceptanceWithdrawals: ProposalAcceptanceWithdrawal[];
  executedAgreementId: string | null;
  supersededByProposalId: string | null;
  supersedesProposalId: string | null;
  events: ProposalBusinessEventV1[];
}

export type PersistedProposalState = Readonly<MutableProposalState>;

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
    let proposalNumber: string;
    let title: string;
    try {
      proposalNumber = ProposalNumber.create(input.proposalNumber).value;
      title = ProposalTitle.create(input.title).value;
    } catch (error) {
      if (error instanceof ProposalValueError) {
        throw new ProposalDomainError("IDENTITY_INVALID", error.message);
      }
      throw error;
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
      proposalNumber,
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
        title,
        engagementTypeCode: input.engagementTypePolicy.code,
        engagementTypePolicyVersion: input.engagementTypePolicy.policyVersion,
        expirationAt,
        expirationOverrideReason,
        content: {
          schemaVersion: PROPOSAL_CONTENT_SCHEMA_VERSION,
          title,
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
      qualityReviewRequestedByUserId: null,
      revisionOpen: false,
      acceptances: [],
      currentAcceptanceId: null,
      acceptanceWithdrawals: [],
      executedAgreementId: null,
      supersededByProposalId: null,
      supersedesProposalId: null,
      events: []
    };
    const aggregate = new ProposalAggregate(state, deepFreeze(clone(input.engagementTypePolicy)));
    aggregate.recordEvent("PROPOSAL_CREATED", context, "Proposal created.", {});
    return aggregate;
  }

  static createReplacement(
    source: ProposalAggregate,
    input: CreateReplacementProposalInput,
    context: ProposalCommandContext
  ) {
    if (!["SUBMITTED", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED"].includes(source.stateValue.status)) {
      throw new ProposalDomainError(
        "SUPERSESSION_INVALID",
        "Only a submitted, viewed, accepted, declined, or expired Proposal may be replaced."
      );
    }
    if (source.stateValue.executedAgreementId) {
      throw new ProposalDomainError(
        "SUPERSESSION_INVALID",
        "A Proposal with an executed Agreement cannot be replaced."
      );
    }
    const sourceVersion = source.submittedVersion();
    const replacement = ProposalAggregate.create(
      {
        id: input.id,
        proposalNumber: input.proposalNumber,
        companyId: source.stateValue.companyId,
        clientId: source.stateValue.clientId,
        ownerId: input.ownerId,
        engagementTypePolicy: source.engagementPolicy,
        pricingSnapshot: input.pricingSnapshot ?? source.stateValue.pricingSnapshot,
        title: input.title ?? sourceVersion.draft.title,
        expirationAt: input.expirationAt,
        expirationOverrideReason: input.expirationOverrideReason
      },
      context
    );
    replacement.stateValue.supersedesProposalId = source.stateValue.id;
    replacement.stateValue.workingDraft = deepFreeze({
      ...clone(sourceVersion.draft),
      title: input.title ? ProposalTitle.create(input.title).value : sourceVersion.draft.title,
      content: {
        ...clone(sourceVersion.draft.content),
        title: input.title ? ProposalTitle.create(input.title).value : sourceVersion.draft.title
      },
      expirationAt: replacement.stateValue.workingDraft.expirationAt,
      expirationOverrideReason: replacement.stateValue.workingDraft.expirationOverrideReason
    });
    replacement.stateValue.events[0] = deepFreeze({
      ...replacement.stateValue.events[0],
      metadata: eventMetadata({ supersedesProposalId: source.stateValue.id })
    });
    return replacement;
  }

  static rehydrate(state: PersistedProposalState, engagementPolicy: EngagementTypePolicyV1) {
    if (state.contractVersion !== PROPOSAL_CONTRACT_VERSION) {
      throw new ProposalDomainError("IDENTITY_INVALID", "Unsupported Proposal contract version.");
    }
    if (
      state.engagementTypeCode !== engagementPolicy.code ||
      state.engagementTypePolicyVersion !== engagementPolicy.policyVersion
    ) {
      throw new ProposalDomainError(
        "IDENTITY_INVALID",
        "Persisted Proposal Engagement Type policy does not match the supplied policy."
      );
    }
    if (!isValidMajorRecordNumber("PROPOSAL", state.proposalNumber)) {
      throw new ProposalDomainError("IDENTITY_INVALID", "Persisted Proposal number is invalid.");
    }
    return new ProposalAggregate(
      {
        ...(clone(state) as MutableProposalState),
        qualityReviewRequestedByUserId: state.qualityReviewRequestedByUserId ?? null,
        supersedesProposalId: state.supersedesProposalId ?? null
      },
      deepFreeze(clone(engagementPolicy))
    );
  }

  get state(): ProposalState {
    return deepFreeze(clone(this.stateValue)) as ProposalState;
  }

  get persistenceState(): PersistedProposalState {
    return deepFreeze(clone(this.stateValue));
  }

  proposalVersionStatus(versionId: string): ProposalVersionStatus {
    if (!this.stateValue.versions.some((version) => version.versionId === versionId)) {
      throw new ProposalDomainError("VERSION_REQUIRED", "Proposal Version is unavailable.");
    }
    return this.stateValue.submittedVersionId === versionId ? "SUBMITTED" : "SAVED";
  }

  currentVersionRepresentsWorkingDraft() {
    return (
      this.currentVersion() !== null &&
      this.stateValue.versionDraftRevision === this.stateValue.draftRevision
    );
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
    let title = this.stateValue.workingDraft.title;
    if (update.title !== undefined) {
      try {
        title = ProposalTitle.create(update.title).value;
      } catch (error) {
        if (error instanceof ProposalValueError) {
          throw new ProposalDomainError("IDENTITY_INVALID", error.message);
        }
        throw error;
      }
    }
    this.stateValue.workingDraft = deepFreeze({
      ...clone(this.stateValue.workingDraft),
      ...clone(update),
      title,
      expirationAt: nextExpiration,
      expirationOverrideReason: overrideReason
    });
    this.stateValue.draftRevision += 1;
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
      versionNumber: ProposalVersionNumber.create(this.stateValue.versions.length + 1).value,
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

  attachPricingVersion(snapshot: ProposalPricingSnapshot, context: ProposalCommandContext) {
    this.assertEventContext(context);
    this.requireDraftEditable();
    if (snapshot.schemaVersion !== 2 || !snapshot.pricingVersionId.trim()) {
      throw new ProposalDomainError(
        "PRICING_SOURCE_INELIGIBLE",
        "Proposal requires an exact immutable Pricing Version."
      );
    }
    if (snapshot.companyId !== this.stateValue.companyId) {
      throw new ProposalDomainError("COMPANY_MISMATCH", "Pricing Version and Proposal must belong to the same Company.");
    }
    if (snapshot.clientId !== this.stateValue.clientId) {
      throw new ProposalDomainError("CLIENT_MISMATCH", "Pricing Version and Proposal must belong to the same Client.");
    }
    if (snapshot.sourceStatus !== "QUOTED") {
      throw new ProposalDomainError("PRICING_SOURCE_INELIGIBLE", "Proposal requires an approved quoted Pricing Version.");
    }
    this.stateValue.pricingSnapshot = deepFreeze(clone(snapshot));
    this.stateValue.draftRevision += 1;
    this.recordEvent(
      "PROPOSAL_PRICING_VERSION_ATTACHED",
      context,
      `Pricing Version ${snapshot.pricingVersionNumber} attached.`,
      eventMetadata({
        pricingProjectId: snapshot.pricingProjectId,
        pricingVersionId: snapshot.pricingVersionId,
        pricingVersionNumber: snapshot.pricingVersionNumber
      })
    );
  }

  requestQualityReview(context: ProposalCommandContext) {
    this.assertEventContext(context);
    const version = this.requireCurrentVersion();
    if (this.stateValue.status !== "DRAFT") {
      throw new ProposalDomainError(
        "REVIEW_TRANSITION_INVALID",
        "Only a Draft Proposal may enter Quality Review."
      );
    }
    this.stateValue.status = "INTERNAL_REVIEW";
    this.stateValue.qualityReviewRequestedByUserId = context.responsibleUserId;
    this.recordEvent(
      "PROPOSAL_INTERNAL_REVIEW_REQUESTED",
      context,
      "Proposal submitted for Quality Review.",
      eventMetadata({
        proposalVersionId: version.versionId,
        reviewMethod: "QUALITY_REVIEW",
        requestedByUserId: context.responsibleUserId
      })
    );
  }

  submitForExecutiveAuthorization(context: ProposalCommandContext) {
    this.assertEventContext(context);
    const version = this.requireCurrentVersion();
    if (this.stateValue.status !== "INTERNAL_REVIEW") {
      throw new ProposalDomainError(
        "REVIEW_TRANSITION_INVALID",
        "Executive Authorization requires a Proposal in Internal Review."
      );
    }
    if (version.createdByUserId === context.responsibleUserId) {
      throw new ProposalDomainError(
        "REVIEWER_NOT_INDEPENDENT",
        "A Proposal Version creator cannot complete Internal Review."
      );
    }
    this.stateValue.status = "EXECUTIVE_AUTHORIZATION";
    this.stateValue.qualityReviewRequestedByUserId = null;
    this.recordEvent(
      "PROPOSAL_EXECUTIVE_AUTHORIZATION_REQUESTED",
      context,
      "Proposal submitted for Executive Authorization.",
      eventMetadata({ proposalVersionId: version.versionId })
    );
  }

  approveProposal(context: ProposalCommandContext) {
    this.assertEventContext(context);
    const version = this.requireCurrentVersion();
    if (this.stateValue.status !== "EXECUTIVE_AUTHORIZATION") {
      throw new ProposalDomainError(
        "SUBMISSION_TRANSITION_INVALID",
        "Only a Proposal awaiting Executive Authorization may be approved."
      );
    }
    this.stateValue.status = "APPROVED";
    this.stateValue.submittedVersionId = version.versionId;
    this.stateValue.effectiveAt = context.occurredAt;
    this.recordEvent(
      "PROPOSAL_APPROVED",
      context,
      `Proposal Version ${version.versionNumber} approved.`,
      eventMetadata({ proposalVersionId: version.versionId })
    );
  }

  rejectProposal(context: ProposalCommandContext) {
    this.assertEventContext(context);
    if (this.stateValue.status !== "INTERNAL_REVIEW" && this.stateValue.status !== "EXECUTIVE_AUTHORIZATION") {
      throw new ProposalDomainError(
        "REVIEW_TRANSITION_INVALID",
        "Proposal may be rejected only during Internal Review or Executive Authorization."
      );
    }
    const version = this.requireCurrentVersion();
    this.stateValue.status = "REJECTED";
    this.stateValue.closedAt = context.occurredAt;
    this.recordEvent(
      "PROPOSAL_REJECTED",
      context,
      `Proposal Version ${version.versionNumber} rejected.`,
      eventMetadata({ proposalVersionId: version.versionId })
    );
  }

  requestChanges(context: ProposalCommandContext) {
    this.assertEventContext(context);
    if (this.stateValue.status !== "INTERNAL_REVIEW") {
      throw new ProposalDomainError(
        "REVIEW_TRANSITION_INVALID",
        "Changes can be requested only during Quality Review."
      );
    }
    const version = this.requireCurrentVersion();
    if (version.createdByUserId === context.responsibleUserId) {
      throw new ProposalDomainError(
        "REVIEWER_NOT_INDEPENDENT",
        "A Proposal Version creator cannot review their own work."
      );
    }
    this.stateValue.status = "DRAFT";
    this.stateValue.qualityReviewRequestedByUserId = null;
    this.recordEvent(
      "PROPOSAL_CHANGES_REQUESTED",
      context,
      "Proposal changes requested during Quality Review.",
      eventMetadata({ proposalVersionId: version.versionId, reviewMethod: "QUALITY_REVIEW" })
    );
  }

  submit(context: ProposalCommandContext, authorization: ProposalSubmissionAuthorization) {
    this.assertEventContext(context);
    const version = this.requireCurrentVersion();
    if (this.stateValue.submittedVersionId) {
      throw new ProposalDomainError(
        "SUBMISSION_TRANSITION_INVALID",
        "Each Proposal may be submitted exactly once. Create a replacement Proposal for revisions."
      );
    }
    let businessJustification: string | null = null;
    if (authorization.method === "QUALITY_REVIEW") {
      if (this.stateValue.status !== "INTERNAL_REVIEW") {
        throw new ProposalDomainError(
          "SUBMISSION_NOT_AUTHORIZED",
          "Quality Review submission requires a Proposal in Quality Review."
        );
      }
      const reviewerUserId = requireText(
        authorization.reviewerUserId,
        "Quality reviewer identity is required."
      );
      if (reviewerUserId !== context.responsibleUserId) {
        throw new ProposalDomainError(
          "SUBMISSION_NOT_AUTHORIZED",
          "The responsible user must be the identified Quality reviewer."
        );
      }
      if (reviewerUserId === version.createdByUserId) {
        throw new ProposalDomainError(
          "REVIEWER_NOT_INDEPENDENT",
          "A Proposal Version creator cannot complete Quality Review on their own Proposal."
        );
      }
    } else {
      if (this.stateValue.status !== "DRAFT") {
        throw new ProposalDomainError(
          "SUBMISSION_TRANSITION_INVALID",
          "Executive Authorization applies only to a Draft Proposal."
        );
      }
      const authorizedByUserId = requireText(
        authorization.authorizedByUserId,
        "Executive Authorization author identity is required."
      );
      if (authorizedByUserId !== context.responsibleUserId) {
        throw new ProposalDomainError(
          "SUBMISSION_NOT_AUTHORIZED",
          "The responsible user must be the identified Executive Authorization author."
        );
      }
      businessJustification = authorization.businessJustification.trim();
      if (!businessJustification) {
        throw new ProposalDomainError(
          "BUSINESS_JUSTIFICATION_REQUIRED",
          "Executive Authorization requires Business Justification."
        );
      }
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
    this.stateValue.submittedVersionId = version.versionId;
    this.stateValue.status = "SUBMITTED";
    this.stateValue.effectiveAt = context.occurredAt;
    this.stateValue.closedAt = null;
    this.stateValue.revisionOpen = false;
    this.stateValue.qualityReviewRequestedByUserId = null;
    this.recordEvent(
      "PROPOSAL_SUBMITTED",
      context,
      `Proposal Version ${version.versionNumber} submitted.`,
      eventMetadata({
        proposalVersionId: version.versionId,
        submissionMethod: authorization.method,
        reviewMethod: authorization.method,
        authorizedByUserId: context.responsibleUserId,
        businessJustification,
        supersedesProposalId: this.stateValue.supersedesProposalId
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

  supersedeBy(replacement: ProposalAggregate, context: ProposalCommandContext) {
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
    if (
      replacement.stateValue.status !== "SUBMITTED" ||
      replacement.stateValue.supersedesProposalId !== this.stateValue.id ||
      replacement.stateValue.companyId !== this.stateValue.companyId ||
      replacement.stateValue.clientId !== this.stateValue.clientId
    ) {
      throw new ProposalDomainError(
        "SUPERSESSION_INVALID",
        "Supersession requires a submitted replacement Proposal for the same Company and Client."
      );
    }
    const replacementProposalId = replacement.stateValue.id;
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
      !["DRAFT", "INTERNAL_REVIEW", "APPROVED", "REJECTED", "DECLINED", "EXPIRED", "SUPERSEDED", "ACCEPTED"].includes(
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
    if (this.stateValue.status !== "DRAFT") {
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
