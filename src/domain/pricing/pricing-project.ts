import type { PricingModelType } from "@/domain/pricing/types";
import type { PricingGovernanceEvent } from "@/domain/pricing/pricing-governance-events";
import {
  PricingConcurrencyError,
  PricingGovernanceError,
  PricingTransitionError
} from "@/domain/pricing/pricing-governance-errors";
import {
  DraftCurrency,
  PricingIdentity,
  PricingVersionNumber,
  ReviewFinding,
  pricingTimestamp,
  type ApprovedVersion,
  type ReviewCandidate,
  type ReviewDecision
} from "@/domain/pricing/pricing-governance-value-objects";

export type PricingProjectLifecycleStatus = "DRAFT" | "IN_REVIEW" | "QUOTED" | "ARCHIVED";

export type PricingTransition =
  | "UPDATE_DRAFT"
  | "SAVE_VERSION"
  | "REQUEST_QUALITY_REVIEW"
  | "APPROVE_VERSION"
  | "REJECT_VERSION"
  | "BEGIN_REVISION"
  | "ARCHIVE"
  | "CREATE_PROPOSAL";

export interface PricingTransitionState {
  readonly status: PricingProjectLifecycleStatus;
  readonly hasDraftCurrentVersion: boolean;
  readonly reviewCandidateCreatorId: string | null;
}

export function permittedPricingTransitions(
  state: PricingTransitionState,
  actorId?: string
): readonly PricingTransition[] {
  if (state.status === "ARCHIVED") return [];
  if (state.status === "DRAFT") {
    const transitions: PricingTransition[] = ["UPDATE_DRAFT", "SAVE_VERSION", "ARCHIVE"];
    if (state.hasDraftCurrentVersion) transitions.push("REQUEST_QUALITY_REVIEW");
    return transitions;
  }
  if (state.status === "IN_REVIEW") {
    return actorId && actorId === state.reviewCandidateCreatorId
      ? []
      : ["APPROVE_VERSION", "REJECT_VERSION"];
  }
  return ["BEGIN_REVISION", "ARCHIVE", "CREATE_PROPOSAL"];
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export interface PricingDraft {
  readonly projectName: string;
  readonly pricingModel: PricingModelType;
  readonly currency: "USD";
  readonly pricingConfigurationVersionId: string;
  readonly pricingConfigurationVersion: number;
  readonly configurationSchemaVersion: number;
  readonly engineVersion: string;
  readonly methodologyVersion: string;
  readonly inputSnapshot: JsonObject;
  readonly outputSnapshot: JsonObject;
  readonly explanationSnapshot: JsonObject;
  readonly catalogSnapshot: JsonObject;
}

export type PricingVersionContent = PricingDraft;

export interface PricingVersion {
  readonly id: PricingIdentity;
  readonly number: PricingVersionNumber;
  readonly creatorId: PricingIdentity;
  readonly createdAt: string;
  readonly draftCurrency: DraftCurrency;
  readonly content: PricingVersionContent;
}

export interface PricingCommandContext {
  readonly commandId: string;
  readonly eventId: string;
  readonly actorId: string;
  readonly occurredAt: string;
  readonly expectedRevision: number;
}

export interface PricingCommandResult {
  readonly idempotentReplay: boolean;
  readonly revision: number;
  readonly events: readonly PricingGovernanceEvent[];
}

export interface ProposalEligiblePricingVersion {
  readonly pricingProjectId: string;
  readonly pricingVersionId: string;
  readonly versionNumber: number;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly content: PricingVersionContent;
}

interface ProcessedCommand {
  readonly fingerprint: string;
  readonly revision: number;
}

export interface PersistedPricingProjectState {
  readonly id: string;
  readonly companyId: string;
  readonly clientId: string;
  readonly ownerId: string;
  readonly estimateNumber: string;
  readonly status: PricingProjectLifecycleStatus;
  readonly revision: number;
  readonly draftCurrency: number;
  readonly draft: PricingDraft;
  readonly versions: readonly {
    readonly id: string;
    readonly number: number;
    readonly creatorId: string;
    readonly createdAt: string;
    readonly draftCurrency: number;
    readonly content: PricingVersionContent;
  }[];
  readonly reviewCandidate: null | {
    readonly versionId: string;
    readonly versionNumber: number;
    readonly requestedBy: string;
    readonly requestedAt: string;
  };
  readonly approvedVersion: null | {
    readonly versionId: string;
    readonly versionNumber: number;
    readonly approvedBy: string;
    readonly approvedAt: string;
  };
  readonly reviewDecisions: readonly {
    readonly outcome: "APPROVED" | "REJECTED";
    readonly versionId: string;
    readonly versionNumber: number;
    readonly decidedBy: string;
    readonly decidedAt: string;
    readonly finding?: string;
  }[];
  readonly processedCommands: readonly {
    readonly commandId: string;
    readonly fingerprint: string;
    readonly revision: number;
  }[];
  readonly eventIds: readonly string[];
}

function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function immutableDraft(draft: PricingDraft): PricingDraft {
  const projectName = draft.projectName.trim();
  if (
    !projectName ||
    !draft.pricingConfigurationVersionId.trim() ||
    !Number.isSafeInteger(draft.pricingConfigurationVersion) ||
    draft.pricingConfigurationVersion < 1 ||
    !Number.isSafeInteger(draft.configurationSchemaVersion) ||
    draft.configurationSchemaVersion < 1 ||
    !draft.engineVersion.trim() ||
    !draft.methodologyVersion.trim() ||
    draft.currency !== "USD"
  ) {
    throw new PricingGovernanceError(
      "VERSION_EVIDENCE_INVALID",
      "Pricing Draft evidence is incomplete or invalid."
    );
  }
  return deepFreeze({
    ...draft,
    projectName,
    pricingConfigurationVersionId: draft.pricingConfigurationVersionId.trim(),
    engineVersion: draft.engineVersion.trim(),
    methodologyVersion: draft.methodologyVersion.trim(),
    inputSnapshot: cloneJson(draft.inputSnapshot),
    outputSnapshot: cloneJson(draft.outputSnapshot),
    explanationSnapshot: cloneJson(draft.explanationSnapshot),
    catalogSnapshot: cloneJson(draft.catalogSnapshot)
  });
}

function fingerprint(action: string, input: unknown) {
  return JSON.stringify([action, input]);
}

export class PricingProject {
  private statusValue: PricingProjectLifecycleStatus = "DRAFT";
  private revisionValue = 1;
  private draftCurrencyValue = DraftCurrency.initial();
  private draftValue: PricingDraft;
  private readonly versionsValue: PricingVersion[] = [];
  private candidateValue: ReviewCandidate | null = null;
  private approvedVersionValue: ApprovedVersion | null = null;
  private readonly reviewDecisionsValue: ReviewDecision[] = [];
  private readonly processedCommands = new Map<string, ProcessedCommand>();
  private readonly eventIds = new Set<string>();

  private constructor(
    readonly id: PricingIdentity,
    readonly companyId: PricingIdentity,
    readonly clientId: PricingIdentity,
    readonly ownerId: PricingIdentity,
    readonly estimateNumber: string,
    draft: PricingDraft
  ) {
    this.draftValue = immutableDraft(draft);
  }

  static create(
    input: {
      readonly pricingProjectId: string;
      readonly companyId: string;
      readonly clientId: string;
      readonly ownerId: string;
      readonly estimateNumber: string;
      readonly draft: PricingDraft;
    },
    context: Omit<PricingCommandContext, "expectedRevision">
  ): { readonly project: PricingProject; readonly result: PricingCommandResult } {
    const project = new PricingProject(
      PricingIdentity.create(input.pricingProjectId, "Pricing Project ID"),
      PricingIdentity.create(input.companyId, "Company ID"),
      PricingIdentity.create(input.clientId, "Client ID"),
      PricingIdentity.create(input.ownerId, "Owner ID"),
      PricingIdentity.create(input.estimateNumber, "Estimate number").value,
      input.draft
    );
    const actor = PricingIdentity.create(context.actorId, "Actor ID");
    const commandId = PricingIdentity.create(context.commandId, "Command ID").value;
    const eventId = PricingIdentity.create(context.eventId, "Event ID").value;
    const occurredAt = pricingTimestamp(context.occurredAt);
    const event: PricingGovernanceEvent = {
      type: "PricingProjectCreated",
      eventId,
      commandId,
      pricingProjectId: project.id.value,
      companyId: project.companyId.value,
      clientId: project.clientId.value,
      actorId: actor.value,
      occurredAt,
      aggregateRevision: project.revisionValue
    };
    project.processedCommands.set(commandId, {
      fingerprint: fingerprint("CREATE", input),
      revision: project.revisionValue
    });
    project.eventIds.add(eventId);
    return {
      project,
      result: deepFreeze({
        idempotentReplay: false,
        revision: project.revisionValue,
        events: [deepFreeze(event)]
      })
    };
  }

  static rehydrate(state: PersistedPricingProjectState): PricingProject {
    const project = new PricingProject(
      PricingIdentity.create(state.id, "Pricing Project ID"),
      PricingIdentity.create(state.companyId, "Company ID"),
      PricingIdentity.create(state.clientId, "Client ID"),
      PricingIdentity.create(state.ownerId, "Owner ID"),
      PricingIdentity.create(state.estimateNumber, "Estimate number").value,
      state.draft
    );
    if (!Number.isSafeInteger(state.revision) || state.revision < 1) {
      throw new PricingGovernanceError("OPTIMISTIC_CONCURRENCY_CONFLICT", "Persisted aggregate revision is invalid.");
    }
    project.statusValue = state.status;
    project.revisionValue = state.revision;
    project.draftCurrencyValue = DraftCurrency.create(state.draftCurrency);
    project.versionsValue.push(...state.versions.map((version) => deepFreeze({
      id: PricingIdentity.create(version.id, "Pricing Version ID"),
      number: PricingVersionNumber.create(version.number),
      creatorId: PricingIdentity.create(version.creatorId, "Version creator ID"),
      createdAt: pricingTimestamp(version.createdAt),
      draftCurrency: DraftCurrency.create(version.draftCurrency),
      content: immutableDraft(version.content)
    })));
    project.candidateValue = state.reviewCandidate ? deepFreeze({
      versionId: PricingIdentity.create(state.reviewCandidate.versionId, "Pricing Version ID"),
      versionNumber: PricingVersionNumber.create(state.reviewCandidate.versionNumber),
      requestedBy: PricingIdentity.create(state.reviewCandidate.requestedBy, "Review requester ID"),
      requestedAt: pricingTimestamp(state.reviewCandidate.requestedAt)
    }) : null;
    project.approvedVersionValue = state.approvedVersion ? deepFreeze({
      versionId: PricingIdentity.create(state.approvedVersion.versionId, "Pricing Version ID"),
      versionNumber: PricingVersionNumber.create(state.approvedVersion.versionNumber),
      approvedBy: PricingIdentity.create(state.approvedVersion.approvedBy, "Reviewer ID"),
      approvedAt: pricingTimestamp(state.approvedVersion.approvedAt)
    }) : null;
    project.reviewDecisionsValue.push(...state.reviewDecisions.map((decision) => deepFreeze(
      decision.outcome === "APPROVED" ? {
        outcome: "APPROVED" as const,
        versionId: PricingIdentity.create(decision.versionId, "Pricing Version ID"),
        versionNumber: PricingVersionNumber.create(decision.versionNumber),
        decidedBy: PricingIdentity.create(decision.decidedBy, "Reviewer ID"),
        decidedAt: pricingTimestamp(decision.decidedAt)
      } : {
        outcome: "REJECTED" as const,
        versionId: PricingIdentity.create(decision.versionId, "Pricing Version ID"),
        versionNumber: PricingVersionNumber.create(decision.versionNumber),
        decidedBy: PricingIdentity.create(decision.decidedBy, "Reviewer ID"),
        decidedAt: pricingTimestamp(decision.decidedAt),
        finding: ReviewFinding.create(decision.finding ?? "")
      }
    )));
    for (const command of state.processedCommands) {
      project.processedCommands.set(PricingIdentity.create(command.commandId, "Command ID").value, {
        fingerprint: command.fingerprint,
        revision: command.revision
      });
    }
    for (const eventId of state.eventIds) project.eventIds.add(PricingIdentity.create(eventId, "Event ID").value);
    return project;
  }

  get status() {
    return this.statusValue;
  }

  get revision() {
    return this.revisionValue;
  }

  get draftCurrency() {
    return this.draftCurrencyValue;
  }

  get draft() {
    return this.draftValue;
  }

  get versions(): readonly PricingVersion[] {
    return this.versionsValue;
  }

  get reviewCandidate() {
    return this.candidateValue;
  }

  get approvedVersion() {
    return this.approvedVersionValue;
  }

  get reviewDecisions(): readonly ReviewDecision[] {
    return this.reviewDecisionsValue;
  }

  get persistenceState(): PersistedPricingProjectState {
    return deepFreeze({
      id: this.id.value,
      companyId: this.companyId.value,
      clientId: this.clientId.value,
      ownerId: this.ownerId.value,
      estimateNumber: this.estimateNumber,
      status: this.statusValue,
      revision: this.revisionValue,
      draftCurrency: this.draftCurrencyValue.revision,
      draft: this.draftValue,
      versions: this.versionsValue.map((version) => ({
        id: version.id.value, number: version.number.value, creatorId: version.creatorId.value,
        createdAt: version.createdAt, draftCurrency: version.draftCurrency.revision, content: version.content
      })),
      reviewCandidate: this.candidateValue ? {
        versionId: this.candidateValue.versionId.value,
        versionNumber: this.candidateValue.versionNumber.value,
        requestedBy: this.candidateValue.requestedBy.value,
        requestedAt: this.candidateValue.requestedAt
      } : null,
      approvedVersion: this.approvedVersionValue ? {
        versionId: this.approvedVersionValue.versionId.value,
        versionNumber: this.approvedVersionValue.versionNumber.value,
        approvedBy: this.approvedVersionValue.approvedBy.value,
        approvedAt: this.approvedVersionValue.approvedAt
      } : null,
      reviewDecisions: this.reviewDecisionsValue.map((decision) => ({
        outcome: decision.outcome,
        versionId: decision.versionId.value,
        versionNumber: decision.versionNumber.value,
        decidedBy: decision.decidedBy.value,
        decidedAt: decision.decidedAt,
        ...(decision.outcome === "REJECTED" ? { finding: decision.finding.value } : {})
      })),
      processedCommands: [...this.processedCommands].map(([commandId, command]) => ({ commandId, ...command })),
      eventIds: [...this.eventIds]
    });
  }

  updateDraft(draft: PricingDraft, context: PricingCommandContext): PricingCommandResult {
    const immutable = immutableDraft(draft);
    return this.execute("UPDATE_DRAFT", immutable, context, (actorId, occurredAt, eventId) => {
      this.requireStatus("Update Draft", "DRAFT");
      this.draftValue = immutable;
      this.draftCurrencyValue = this.draftCurrencyValue.advance();
      return {
        type: "PricingDraftUpdated",
        eventId,
        commandId: context.commandId,
        pricingProjectId: this.id.value,
        companyId: this.companyId.value,
        actorId,
        occurredAt,
        aggregateRevision: this.revisionValue + 1,
        draftCurrency: this.draftCurrencyValue.revision
      };
    });
  }

  saveVersion(
    input: { readonly pricingVersionId: string; readonly content: PricingVersionContent },
    context: PricingCommandContext
  ): PricingCommandResult {
    const versionId = PricingIdentity.create(input.pricingVersionId, "Pricing Version ID");
    const content = immutableDraft(input.content);
    return this.execute("SAVE_VERSION", input, context, (actorId, occurredAt, eventId) => {
      this.requireStatus("Save Version", "DRAFT");
      if (this.versionsValue.some((version) => version.id.equals(versionId))) {
        throw new PricingGovernanceError(
          "VERSION_ID_REUSED",
          "A Pricing Version identity can never be reused."
        );
      }
      if (JSON.stringify(content) !== JSON.stringify(this.draftValue)) {
        throw new PricingGovernanceError(
          "PRICING_VERSION_STALE",
          "A Pricing Version must capture the current authoritative Draft exactly."
        );
      }
      const number = this.versionsValue.length
        ? this.versionsValue[this.versionsValue.length - 1]!.number.next()
        : PricingVersionNumber.create(1);
      const version = deepFreeze({
        id: versionId,
        number,
        creatorId: PricingIdentity.create(actorId, "Version creator ID"),
        createdAt: occurredAt,
        draftCurrency: this.draftCurrencyValue,
        content
      });
      this.versionsValue.push(version);
      return {
        type: "PricingVersionSaved",
        eventId,
        commandId: context.commandId,
        pricingProjectId: this.id.value,
        companyId: this.companyId.value,
        actorId,
        occurredAt,
        aggregateRevision: this.revisionValue + 1,
        pricingVersionId: version.id.value,
        versionNumber: version.number.value,
        draftCurrency: version.draftCurrency.revision
      };
    });
  }

  requestQualityReview(versionNumber: PricingVersionNumber, context: PricingCommandContext) {
    return this.execute(
      "REQUEST_QUALITY_REVIEW",
      { versionNumber: versionNumber.value },
      context,
      (actorId, occurredAt, eventId) => {
        this.requireStatus("Request Quality Review", "DRAFT");
        const version = this.findVersion(versionNumber);
        if (!version.draftCurrency.equals(this.draftCurrencyValue)) {
          throw new PricingGovernanceError(
            "PRICING_VERSION_STALE",
            "Quality Review requires a Version that represents the current working Draft."
          );
        }
        this.statusValue = "IN_REVIEW";
        this.candidateValue = deepFreeze({
          versionId: version.id,
          versionNumber: version.number,
          requestedBy: PricingIdentity.create(actorId, "Review requester ID"),
          requestedAt: occurredAt
        });
        return {
          type: "QualityReviewRequested",
          eventId,
          commandId: context.commandId,
          pricingProjectId: this.id.value,
          companyId: this.companyId.value,
          actorId,
          occurredAt,
          aggregateRevision: this.revisionValue + 1,
          pricingVersionId: version.id.value,
          versionNumber: version.number.value
        };
      }
    );
  }

  approveVersion(context: PricingCommandContext) {
    return this.execute("APPROVE_VERSION", {}, context, (actorId, occurredAt, eventId) => {
      this.requireStatus("Approve Version", "IN_REVIEW");
      const candidate = this.requireCandidate();
      const version = this.findVersion(candidate.versionNumber);
      if (version.creatorId.value === actorId) {
        throw new PricingGovernanceError(
          "REVIEWER_NOT_INDEPENDENT",
          "A Pricing Version creator may never approve that Version."
        );
      }
      const reviewer = PricingIdentity.create(actorId, "Reviewer ID");
      this.statusValue = "QUOTED";
      this.approvedVersionValue = deepFreeze({
        versionId: version.id,
        versionNumber: version.number,
        approvedBy: reviewer,
        approvedAt: occurredAt
      });
      this.reviewDecisionsValue.push(
        deepFreeze({
          outcome: "APPROVED",
          versionId: version.id,
          versionNumber: version.number,
          decidedBy: reviewer,
          decidedAt: occurredAt
        })
      );
      this.candidateValue = null;
      return {
        type: "QualityReviewApproved",
        eventId,
        commandId: context.commandId,
        pricingProjectId: this.id.value,
        companyId: this.companyId.value,
        actorId,
        occurredAt,
        aggregateRevision: this.revisionValue + 1,
        pricingVersionId: version.id.value,
        versionNumber: version.number.value,
        versionCreatorId: version.creatorId.value
      };
    });
  }

  rejectVersion(finding: ReviewFinding, context: PricingCommandContext) {
    return this.execute(
      "REJECT_VERSION",
      { finding: finding.value },
      context,
      (actorId, occurredAt, eventId) => {
        this.requireStatus("Reject Version", "IN_REVIEW");
        const candidate = this.requireCandidate();
        const version = this.findVersion(candidate.versionNumber);
        if (version.creatorId.value === actorId) {
          throw new PricingGovernanceError(
            "REVIEWER_NOT_INDEPENDENT",
            "A Pricing Version creator may never decide that Version's Quality Review."
          );
        }
        const reviewer = PricingIdentity.create(actorId, "Reviewer ID");
        this.statusValue = "DRAFT";
        this.reviewDecisionsValue.push(
          deepFreeze({
            outcome: "REJECTED",
            versionId: version.id,
            versionNumber: version.number,
            decidedBy: reviewer,
            decidedAt: occurredAt,
            finding
          })
        );
        this.candidateValue = null;
        return {
          type: "QualityReviewRejected",
          eventId,
          commandId: context.commandId,
          pricingProjectId: this.id.value,
          companyId: this.companyId.value,
          actorId,
          occurredAt,
          aggregateRevision: this.revisionValue + 1,
          pricingVersionId: version.id.value,
          versionNumber: version.number.value,
          finding: finding.value
        };
      }
    );
  }

  beginRevision(context: PricingCommandContext) {
    return this.execute("BEGIN_REVISION", {}, context, (actorId, occurredAt, eventId) => {
      this.requireStatus("Begin Revision", "QUOTED");
      const approved = this.approvedVersionValue;
      if (!approved) {
        throw new PricingGovernanceError(
          "APPROVED_VERSION_REQUIRED",
          "A quoted Pricing Project must identify its approved Version."
        );
      }
      this.statusValue = "DRAFT";
      this.draftCurrencyValue = this.draftCurrencyValue.advance();
      return {
        type: "RevisionStarted",
        eventId,
        commandId: context.commandId,
        pricingProjectId: this.id.value,
        companyId: this.companyId.value,
        actorId,
        occurredAt,
        aggregateRevision: this.revisionValue + 1,
        previousApprovedVersionId: approved.versionId.value,
        draftCurrency: this.draftCurrencyValue.revision
      };
    });
  }

  archive(context: PricingCommandContext) {
    return this.execute("ARCHIVE", {}, context, (actorId, occurredAt, eventId) => {
      if (this.statusValue !== "DRAFT" && this.statusValue !== "QUOTED") {
        throw new PricingTransitionError("Archive", this.statusValue);
      }
      this.statusValue = "ARCHIVED";
      return {
        type: "PricingProjectArchived",
        eventId,
        commandId: context.commandId,
        pricingProjectId: this.id.value,
        companyId: this.companyId.value,
        actorId,
        occurredAt,
        aggregateRevision: this.revisionValue + 1
      };
    });
  }

  proposalEligibility(): ProposalEligiblePricingVersion | null {
    if (this.statusValue !== "QUOTED" || !this.approvedVersionValue) return null;
    const version = this.findVersion(this.approvedVersionValue.versionNumber);
    return deepFreeze({
      pricingProjectId: this.id.value,
      pricingVersionId: version.id.value,
      versionNumber: version.number.value,
      approvedBy: this.approvedVersionValue.approvedBy.value,
      approvedAt: this.approvedVersionValue.approvedAt,
      content: version.content
    });
  }

  permittedTransitions(actorId?: string): readonly PricingTransition[] {
    const candidate = this.candidateValue;
    return permittedPricingTransitions({
      status: this.statusValue,
      hasDraftCurrentVersion: this.versionsValue.some((version) =>
        version.draftCurrency.equals(this.draftCurrencyValue)
      ),
      reviewCandidateCreatorId: candidate
        ? this.findVersion(candidate.versionNumber).creatorId.value
        : null
    }, actorId);
  }

  private execute(
    action: string,
    input: unknown,
    context: PricingCommandContext,
    operation: (actorId: string, occurredAt: string, eventId: string) => PricingGovernanceEvent
  ): PricingCommandResult {
    const commandId = PricingIdentity.create(context.commandId, "Command ID").value;
    const commandFingerprint = fingerprint(action, input);
    const processed = this.processedCommands.get(commandId);
    if (processed) {
      if (processed.fingerprint !== commandFingerprint) {
        throw new PricingGovernanceError(
          "IDEMPOTENCY_KEY_REUSED",
          "An idempotency key cannot be reused for a different Pricing command."
        );
      }
      return deepFreeze({ idempotentReplay: true, revision: processed.revision, events: [] });
    }
    if (context.expectedRevision !== this.revisionValue) {
      throw new PricingConcurrencyError(context.expectedRevision, this.revisionValue);
    }
    const actorId = PricingIdentity.create(context.actorId, "Actor ID").value;
    const eventId = PricingIdentity.create(context.eventId, "Event ID").value;
    if (this.eventIds.has(eventId)) {
      throw new PricingGovernanceError(
        "EVENT_ID_REUSED",
        "A Pricing business event identity can never be reused."
      );
    }
    const occurredAt = pricingTimestamp(context.occurredAt);
    const event = operation(actorId, occurredAt, eventId);
    this.revisionValue += 1;
    this.eventIds.add(eventId);
    this.processedCommands.set(commandId, {
      fingerprint: commandFingerprint,
      revision: this.revisionValue
    });
    return deepFreeze({
      idempotentReplay: false,
      revision: this.revisionValue,
      events: [deepFreeze(event)]
    });
  }

  private requireStatus(action: string, status: PricingProjectLifecycleStatus) {
    if (this.statusValue !== status) throw new PricingTransitionError(action, this.statusValue);
  }

  private findVersion(number: PricingVersionNumber) {
    const version = this.versionsValue.find((candidate) => candidate.number.equals(number));
    if (!version) {
      throw new PricingGovernanceError(
        "PRICING_VERSION_NOT_FOUND",
        `Pricing Version ${number.value} does not exist.`
      );
    }
    return version;
  }

  private requireCandidate() {
    if (!this.candidateValue) {
      throw new PricingGovernanceError(
        "REVIEW_CANDIDATE_REQUIRED",
        "Quality Review requires one bound Pricing Version."
      );
    }
    return this.candidateValue;
  }
}
