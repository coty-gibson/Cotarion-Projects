import { describe, expect, it } from "vitest";
import {
  PricingGovernanceError,
  PricingProject,
  PricingVersionNumber,
  ReviewFinding,
  type PricingCommandContext,
  type PricingDraft
} from "@/domain/pricing";

function draft(overrides: Partial<PricingDraft> = {}): PricingDraft {
  return {
    projectName: "Operating model redesign",
    pricingModel: "PROJECT",
    currency: "USD",
    pricingConfigurationVersionId: "configuration-version-2",
    pricingConfigurationVersion: 2,
    configurationSchemaVersion: 1,
    engineVersion: "pricing-engine/2.0.0",
    methodologyVersion: "project-pricing/1.0.0",
    inputSnapshot: { serviceLines: [{ serviceId: "service-1", quantity: "1" }] },
    outputSnapshot: { finalAmount: "12500.00", currency: "USD" },
    explanationSnapshot: { steps: [{ label: "Final price", amount: "12500.00" }] },
    catalogSnapshot: {
      services: [{ id: "service-1", name: "Operating Model", unitPrice: "12500.00" }]
    },
    ...overrides
  };
}

let sequence = 0;

function context(project: PricingProject, actorId = "user-creator"): PricingCommandContext {
  sequence += 1;
  return {
    commandId: `command-${sequence}`,
    eventId: `event-${sequence}`,
    actorId,
    occurredAt: `2026-07-21T12:${String(sequence).padStart(2, "0")}:00.000Z`,
    expectedRevision: project.revision
  };
}

function create() {
  sequence = 0;
  return PricingProject.create(
    {
      pricingProjectId: "pricing-project-1",
      companyId: "company-1",
      clientId: "client-1",
      ownerId: "user-owner",
      estimateNumber: "EST-000001",
      draft: draft()
    },
    {
      commandId: "command-create",
      eventId: "event-create",
      actorId: "user-owner",
      occurredAt: "2026-07-21T12:00:00.000Z"
    }
  );
}

function expectCode(operation: () => unknown, code: PricingGovernanceError["code"]) {
  expect(operation).toThrowError(PricingGovernanceError);
  try {
    operation();
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

function saveCurrent(project: PricingProject, id = "pricing-version-1", actor = "user-creator") {
  return project.saveVersion(
    { pricingVersionId: id, content: project.draft },
    context(project, actor)
  );
}

function requestCurrent(project: PricingProject, actor = "user-requester") {
  const version = project.versions[project.versions.length - 1]!;
  return project.requestQualityReview(version.number, context(project, actor));
}

function quote(project: PricingProject) {
  saveCurrent(project);
  requestCurrent(project);
  project.approveVersion(context(project, "user-independent-reviewer"));
}

describe("Pricing Project governance aggregate", () => {
  it("creates a mutable Draft and an append-only creation event", () => {
    const { project, result } = create();

    expect(project.status).toBe("DRAFT");
    expect(project.revision).toBe(1);
    expect(project.draftCurrency.revision).toBe(1);
    expect(project.versions).toEqual([]);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: "PricingProjectCreated",
        pricingProjectId: "pricing-project-1",
        aggregateRevision: 1
      })
    ]);
    expect(Object.isFrozen(result.events[0])).toBe(true);
  });

  it("updates only Draft state and advances aggregate revision and Draft currency", () => {
    const { project } = create();
    const result = project.updateDraft(
      draft({ projectName: "Revised operating model" }),
      context(project)
    );

    expect(project.draft.projectName).toBe("Revised operating model");
    expect(project.draftCurrency.revision).toBe(2);
    expect(project.revision).toBe(2);
    expect(result.events[0]).toMatchObject({
      type: "PricingDraftUpdated",
      draftCurrency: 2,
      aggregateRevision: 2
    });
  });

  it("creates Versions only through explicit Save Version with monotonic numbers", () => {
    const { project } = create();
    const first = saveCurrent(project);
    project.updateDraft(draft({ projectName: "Second scope" }), context(project));
    const second = saveCurrent(project, "pricing-version-2");

    expect(project.versions.map(({ number }) => number.value)).toEqual([1, 2]);
    expect(first.events[0]).toMatchObject({
      type: "PricingVersionSaved",
      pricingVersionId: "pricing-version-1",
      versionNumber: 1
    });
    expect(second.events[0]).toMatchObject({ versionNumber: 2, draftCurrency: 2 });
  });

  it("deeply freezes Version evidence and preserves it through later Draft changes", () => {
    const { project } = create();
    saveCurrent(project);
    const version = project.versions[0]!;
    const preserved = JSON.stringify(version.content);

    expect(Object.isFrozen(version)).toBe(true);
    expect(Object.isFrozen(version.content.inputSnapshot)).toBe(true);
    expect(Object.isFrozen((version.content.inputSnapshot.serviceLines as readonly unknown[])[0])).toBe(
      true
    );

    project.updateDraft(
      draft({ inputSnapshot: { serviceLines: [{ serviceId: "service-2", quantity: "2" }] } }),
      context(project)
    );
    expect(JSON.stringify(version.content)).toBe(preserved);
  });

  it("rejects Save Version content that is not the current authoritative Draft", () => {
    const { project } = create();
    expectCode(
      () =>
        project.saveVersion(
          { pricingVersionId: "pricing-version-stale", content: draft({ projectName: "Other" }) },
          context(project)
        ),
      "PRICING_VERSION_STALE"
    );
    expect(project.versions).toEqual([]);
    expect(project.revision).toBe(1);
  });

  it("requires a saved Draft-current Version for Quality Review and Review never creates one", () => {
    const { project } = create();
    expectCode(
      () => project.requestQualityReview(PricingVersionNumber.create(1), context(project)),
      "PRICING_VERSION_NOT_FOUND"
    );
    expect(project.versions).toHaveLength(0);

    saveCurrent(project);
    project.updateDraft(draft({ projectName: "Changed after Version" }), context(project));
    expect(project.permittedTransitions()).not.toContain("REQUEST_QUALITY_REVIEW");
    expectCode(
      () => project.requestQualityReview(PricingVersionNumber.create(1), context(project)),
      "PRICING_VERSION_STALE"
    );
    expect(project.versions).toHaveLength(1);
    expect(project.status).toBe("DRAFT");
  });

  it("binds an existing current Version for review without creating or changing it", () => {
    const { project } = create();
    saveCurrent(project);
    const version = project.versions[0]!;
    const preserved = JSON.stringify(version);
    const result = requestCurrent(project);

    expect(project.status).toBe("IN_REVIEW");
    expect(project.versions).toHaveLength(1);
    expect(JSON.stringify(project.versions[0])).toBe(preserved);
    expect(project.reviewCandidate).toMatchObject({
      versionId: { value: "pricing-version-1" },
      versionNumber: { value: 1 }
    });
    expect(result.events[0]).toMatchObject({ type: "QualityReviewRequested", versionNumber: 1 });
  });

  it("enforces reviewer independence for approval and rejection with no bypass", () => {
    const { project } = create();
    saveCurrent(project, "pricing-version-1", "founder-creator");
    requestCurrent(project, "founder-creator");

    expect(project.permittedTransitions("founder-creator")).toEqual([]);
    expectCode(
      () => project.approveVersion(context(project, "founder-creator")),
      "REVIEWER_NOT_INDEPENDENT"
    );
    expectCode(
      () =>
        project.rejectVersion(
          ReviewFinding.create("Correct the commercial scope."),
          context(project, "founder-creator")
        ),
      "REVIEWER_NOT_INDEPENDENT"
    );
    expect(project.status).toBe("IN_REVIEW");
    expect(project.revision).toBe(3);
  });

  it("approves the bound Version without creating or mutating it and becomes Proposal eligible", () => {
    const { project } = create();
    saveCurrent(project);
    requestCurrent(project);
    const preserved = JSON.stringify(project.versions[0]);
    const result = project.approveVersion(context(project, "user-reviewer"));

    expect(project.status).toBe("QUOTED");
    expect(project.versions).toHaveLength(1);
    expect(JSON.stringify(project.versions[0])).toBe(preserved);
    expect(project.approvedVersion).toMatchObject({
      versionId: { value: "pricing-version-1" },
      approvedBy: { value: "user-reviewer" }
    });
    expect(project.proposalEligibility()).toMatchObject({
      pricingProjectId: "pricing-project-1",
      pricingVersionId: "pricing-version-1",
      versionNumber: 1,
      approvedBy: "user-reviewer"
    });
    expect(result.events[0]).toMatchObject({ type: "QualityReviewApproved" });
  });

  it("rejects with actionable immutable findings and returns to Draft", () => {
    const { project } = create();
    saveCurrent(project);
    requestCurrent(project);
    const finding = ReviewFinding.create("Correct the discount explanation.");
    const result = project.rejectVersion(finding, context(project, "user-reviewer"));

    expect(project.status).toBe("DRAFT");
    expect(project.reviewCandidate).toBeNull();
    expect(project.reviewDecisions).toEqual([
      expect.objectContaining({ outcome: "REJECTED", finding })
    ]);
    expect(project.versions).toHaveLength(1);
    expect(project.proposalEligibility()).toBeNull();
    expect(result.events[0]).toMatchObject({
      type: "QualityReviewRejected",
      finding: "Correct the discount explanation."
    });
    expectCode(() => ReviewFinding.create("  "), "REVIEW_FINDING_REQUIRED");
  });

  it("makes Drafts and in-review Projects ineligible for Proposal consumption", () => {
    const { project } = create();
    expect(project.proposalEligibility()).toBeNull();
    saveCurrent(project);
    expect(project.proposalEligibility()).toBeNull();
    requestCurrent(project);
    expect(project.proposalEligibility()).toBeNull();
  });

  it("begins a Revision, preserves history, and pauses Proposal eligibility", () => {
    const { project } = create();
    quote(project);
    const preservedVersion = JSON.stringify(project.versions[0]);
    const preservedDecision = JSON.stringify(project.reviewDecisions[0]);
    const previousCurrency = project.draftCurrency.revision;
    const result = project.beginRevision(context(project, "user-owner"));

    expect(project.status).toBe("DRAFT");
    expect(project.draftCurrency.revision).toBe(previousCurrency + 1);
    expect(project.proposalEligibility()).toBeNull();
    expect(JSON.stringify(project.versions[0])).toBe(preservedVersion);
    expect(JSON.stringify(project.reviewDecisions[0])).toBe(preservedDecision);
    expect(result.events[0]).toMatchObject({
      type: "RevisionStarted",
      previousApprovedVersionId: "pricing-version-1"
    });
  });

  it("archives only Draft or Quoted Projects and makes Archive terminal", () => {
    const { project } = create();
    const result = project.archive(context(project));
    expect(project.status).toBe("ARCHIVED");
    expect(project.permittedTransitions()).toEqual([]);
    expect(result.events[0]).toMatchObject({ type: "PricingProjectArchived" });
    expectCode(() => project.updateDraft(draft(), context(project)), "ILLEGAL_PRICING_TRANSITION");

    const reviewed = create().project;
    saveCurrent(reviewed);
    requestCurrent(reviewed);
    expectCode(() => reviewed.archive(context(reviewed)), "ILLEGAL_PRICING_TRANSITION");
  });

  it("exposes only state-legal transitions and no business authority assumptions", () => {
    const { project } = create();
    expect(project.permittedTransitions()).toEqual(["UPDATE_DRAFT", "SAVE_VERSION", "ARCHIVE"]);
    saveCurrent(project);
    expect(project.permittedTransitions()).toContain("REQUEST_QUALITY_REVIEW");
    requestCurrent(project);
    expect(project.permittedTransitions("user-reviewer")).toEqual([
      "APPROVE_VERSION",
      "REJECT_VERSION"
    ]);
    project.approveVersion(context(project, "user-reviewer"));
    expect(project.permittedTransitions()).toEqual([
      "BEGIN_REVISION",
      "ARCHIVE",
      "CREATE_PROPOSAL"
    ]);
  });

  it("rejects every illegal lifecycle transition with explicit domain errors", () => {
    const { project } = create();
    expectCode(() => project.approveVersion(context(project)), "ILLEGAL_PRICING_TRANSITION");
    expectCode(
      () => project.rejectVersion(ReviewFinding.create("Not ready."), context(project)),
      "ILLEGAL_PRICING_TRANSITION"
    );
    expectCode(() => project.beginRevision(context(project)), "ILLEGAL_PRICING_TRANSITION");

    saveCurrent(project);
    requestCurrent(project);
    expectCode(() => project.updateDraft(draft(), context(project)), "ILLEGAL_PRICING_TRANSITION");
    expectCode(
      () => saveCurrent(project, "pricing-version-2"),
      "ILLEGAL_PRICING_TRANSITION"
    );
    expectCode(() => requestCurrent(project), "ILLEGAL_PRICING_TRANSITION");
  });

  it("enforces optimistic revision semantics without partial state changes", () => {
    const { project } = create();
    const stale = { ...context(project), expectedRevision: 0 };
    expectCode(() => project.updateDraft(draft({ projectName: "Stale" }), stale), "OPTIMISTIC_CONCURRENCY_CONFLICT");
    expect(project.revision).toBe(1);
    expect(project.draft.projectName).toBe("Operating model redesign");
  });

  it("replays commands idempotently and rejects key reuse for different work", () => {
    const { project } = create();
    const command = context(project);
    const first = project.saveVersion(
      { pricingVersionId: "pricing-version-1", content: project.draft },
      command
    );
    const replay = project.saveVersion(
      { pricingVersionId: "pricing-version-1", content: project.draft },
      command
    );

    expect(first.idempotentReplay).toBe(false);
    expect(replay).toEqual({ idempotentReplay: true, revision: 2, events: [] });
    expect(project.versions).toHaveLength(1);

    expectCode(
      () =>
        project.updateDraft(
          draft({ projectName: "Different command" }),
          { ...command, expectedRevision: project.revision }
        ),
      "IDEMPOTENCY_KEY_REUSED"
    );
  });

  it("never reuses immutable Version or business event identities", () => {
    const { project } = create();
    saveCurrent(project, "pricing-version-1");
    project.updateDraft(draft({ projectName: "Second scope" }), context(project));
    expectCode(
      () => saveCurrent(project, "pricing-version-1"),
      "VERSION_ID_REUSED"
    );

    const reusedEvent = {
      ...context(project),
      eventId: "event-1"
    };
    expectCode(
      () => project.updateDraft(draft({ projectName: "Third scope" }), reusedEvent),
      "EVENT_ID_REUSED"
    );
  });

  it("validates governance value objects and complete self-sufficient evidence", () => {
    expectCode(() => PricingVersionNumber.create(0), "VERSION_NUMBER_INVALID");
    expectCode(
      () =>
        PricingProject.create(
          {
            pricingProjectId: "pricing-project-2",
            companyId: "company-1",
            clientId: "client-1",
            ownerId: "user-owner",
            estimateNumber: "EST-000002",
            draft: draft({ engineVersion: "" })
          },
          {
            commandId: "invalid-create",
            eventId: "invalid-event",
            actorId: "user-owner",
            occurredAt: "2026-07-21T12:00:00.000Z"
          }
        ),
      "VERSION_EVIDENCE_INVALID"
    );
  });
});
