import { describe, expect, it } from "vitest";
import {
  PRICING_SNAPSHOT_SCHEMA_VERSION,
  type ProposalPricingSnapshot
} from "@/domain/proposals/contracts";
import { engagementTypePolicy } from "@/domain/proposals/engagement-type-policies";
import {
  ProposalAggregate,
  ProposalDomainError,
  type ProposalCommandContext,
  type ProposalWorkingDraft
} from "@/domain/proposals/proposal-domain";

function context(
  sequence: number,
  occurredAt = `2026-07-${String(20 + sequence).padStart(2, "0")}T12:00:00.000Z`
): ProposalCommandContext {
  return {
    eventId: `event-${sequence}`,
    occurredAt,
    responsibleUserId: "user-owner"
  };
}

function pricingSnapshot(
  pricingModel: ProposalPricingSnapshot["pricingModel"] = "PROJECT"
): ProposalPricingSnapshot {
  const base = {
    schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
    pricingProjectId: "pricing-project-1",
    pricingProjectNumber: "EST-000001",
    companyId: "company-1",
    clientId: "client-1",
    operatingGroupCode: "CONSULTING",
    sourceStatus: "QUOTED",
    pricingConfigurationVersionId: "configuration-version-2",
    pricingConfigurationVersion: 2,
    engineVersion: "pricing-engine/2.0.0",
    inputSnapshot: { pricingModel },
    approvedAt: "2026-07-20T10:00:00.000Z",
    approvedByUserId: "user-owner",
    capturedAt: "2026-07-20T10:01:00.000Z"
  } as const;
  if (pricingModel === "PROJECT") {
    return {
      ...base,
      pricingModel,
      methodologyVersion: "project-pricing/1.0.0",
      outputSnapshot: {
        pricingModel,
        methodologyVersion: "project-pricing/1.0.0",
        projectSubtotal: "1000.00",
        complexityMultiplier: "1",
        adjustedSubtotal: "1000.00",
        discountRate: "0",
        discountAmount: "0.00",
        finalAmount: "1000.00",
        currency: "USD"
      }
    };
  }
  if (pricingModel === "ADVISORY_HOURLY") {
    return {
      ...base,
      pricingModel,
      methodologyVersion: "advisory-hourly/1.0.0",
      outputSnapshot: {
        pricingModel,
        methodologyVersion: "advisory-hourly/1.0.0",
        durationMinutes: 60,
        billingIncrements: 2,
        hourlyRate: "250.00",
        finalAmount: "250.00",
        currency: "USD"
      }
    };
  }
  return {
    ...base,
    pricingModel,
    methodologyVersion: "retainer-pricing/1.0.0",
    outputSnapshot: {
      pricingModel,
      methodologyVersion: "retainer-pricing/1.0.0",
      retainerLevelId: "strategic",
      baseMonthlyFee: "2000.00",
      complexityMultiplier: "1",
      complexityAdjustedMonthlyBase: "2000.00",
      termDiscountRate: "0",
      standardDiscountRate: "0",
      totalDiscountRate: "0",
      discountAmount: "0.00",
      fixedMonthlyPayment: pricingModel === "PROFIT_SHARE_RETAINER" ? "0.00" : "1000.00",
      averageAdjustedOperatingProfit: "10000.00",
      profitShareTarget: "1250.00",
      profitShareRate: "0.125",
      estimatedProfitSharePayment: "1250.00",
      finalAmount: "2250.00",
      equivalentPricingModel: null,
      currency: "USD"
    }
  };
}

function createProposal(
  engagementType: Parameters<typeof engagementTypePolicy>[0] = "PROJECT",
  pricingModel: ProposalPricingSnapshot["pricingModel"] = "PROJECT",
  override: Partial<Parameters<typeof ProposalAggregate.create>[0]> = {}
) {
  return ProposalAggregate.create(
    {
      id: "proposal-1",
      proposalNumber: "PRO-000001",
      companyId: "company-1",
      clientId: "client-1",
      ownerId: "user-owner",
      engagementTypePolicy: engagementTypePolicy(engagementType),
      pricingSnapshot: pricingSnapshot(pricingModel),
      title: "Operational improvement",
      ...override
    },
    context(0, "2026-07-20T12:00:00.000Z")
  );
}

const authorizedRecipient = {
  recipientId: "recipient-1",
  contactId: "contact-1",
  name: "Alex Client",
  email: "alex@example.com",
  authorizedToAccept: true
};

function prepareVersion(
  proposal: ProposalAggregate,
  sequence = 1,
  draftUpdate: Partial<ProposalWorkingDraft> = {}
) {
  proposal.updateDraft(
    {
      recipients: [authorizedRecipient],
      commercialTerms: {
        paymentSchedule: "Due on execution",
        billingMethod: "Fixed",
        depositTerms: "None",
        recurrenceAndTerm: "One time",
        cancellationSummary: "Written notice",
        assumptionsAndExclusions: "As presented",
        clientResponsibilities: "Timely access",
        offerNotes: "",
        ...draftUpdate.commercialTerms
      },
      ...draftUpdate
    },
    `2026-07-${String(20 + sequence).padStart(2, "0")}T10:00:00.000Z`
  );
  return proposal.saveVersion({ versionId: `version-${sequence}` }, context(sequence));
}

function expectDomainError(action: () => unknown, code: ProposalDomainError["code"]) {
  expect(action).toThrowError(ProposalDomainError);
  try {
    action();
  } catch (error) {
    expect((error as ProposalDomainError).code).toBe(code);
  }
}

describe("Proposal aggregate", () => {
  it("rehydrates the complete persistence state without losing revision history", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    const rehydrated = ProposalAggregate.rehydrate(
      proposal.persistenceState,
      engagementTypePolicy("PROJECT")
    );

    expect(rehydrated.persistenceState).toEqual(proposal.persistenceState);
    expect(rehydrated.state).toEqual(proposal.state);
  });

  it("creates a Consulting Proposal with a 30-day default expiration and event", () => {
    const proposal = createProposal();

    expect(proposal.state.status).toBe("DRAFT");
    expect(proposal.state.workingDraft.expirationAt).toBe("2026-08-19T12:00:00.000Z");
    expect(proposal.state.effectiveAt).toBeNull();
    expect(proposal.state.closedAt).toBeNull();
    expect(proposal.state.events).toHaveLength(1);
    expect(proposal.state.events[0]).toEqual(
      expect.objectContaining({
        eventType: "PROPOSAL_CREATED",
        companyId: "company-1",
        clientId: "client-1",
        sourceReferenceNumber: "PRO-000001"
      })
    );
  });

  it("requires a reason for an expiration override", () => {
    expectDomainError(
      () =>
        createProposal("PROJECT", "PROJECT", {
          expirationAt: "2026-09-30T12:00:00.000Z"
        }),
      "EXPIRATION_OVERRIDE_REASON_REQUIRED"
    );

    const proposal = createProposal("PROJECT", "PROJECT", {
      expirationAt: "2026-09-30T12:00:00.000Z",
      expirationOverrideReason: "Client procurement schedule"
    });
    expect(proposal.state.workingDraft.expirationOverrideReason).toBe(
      "Client procurement schedule"
    );
  });

  it("rejects cross-Company, cross-Client, unquoted, and incompatible Pricing sources", () => {
    expectDomainError(
      () =>
        createProposal("PROJECT", "PROJECT", {
          pricingSnapshot: { ...pricingSnapshot(), companyId: "company-2" }
        }),
      "COMPANY_MISMATCH"
    );
    expectDomainError(
      () =>
        createProposal("PROJECT", "PROJECT", {
          pricingSnapshot: { ...pricingSnapshot(), clientId: "client-2" }
        }),
      "CLIENT_MISMATCH"
    );
    expectDomainError(
      () =>
        createProposal("PROJECT", "PROJECT", {
          pricingSnapshot: {
            ...pricingSnapshot(),
            sourceStatus: "DRAFT" as "QUOTED"
          }
        }),
      "PRICING_SOURCE_INELIGIBLE"
    );
    expectDomainError(() => createProposal("ADVISORY", "PROJECT"), "PRICING_MODEL_INCOMPATIBLE");
  });

  it("saves immutable sequential versions without changing the Pricing snapshot", () => {
    const proposal = createProposal();
    const first = prepareVersion(proposal);
    proposal.updateDraft({ title: "Updated offer" }, "2026-07-22T10:00:00.000Z");
    const second = proposal.saveVersion(
      { versionId: "version-2", revisionReason: "Scope clarified" },
      context(2)
    );

    expect(first.versionNumber).toBe(1);
    expect(second.versionNumber).toBe(2);
    expect(second.predecessorVersionId).toBe(first.versionId);
    expect(second.revisionReason).toBe("Scope clarified");
    expect(first.draft.title).toBe("Operational improvement");
    expect(second.draft.title).toBe("Updated offer");
    expect(first.pricingSnapshot).toEqual(second.pricingSnapshot);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.pricingSnapshot)).toBe(true);
  });

  it("requires a current immutable version before review or submission", () => {
    const proposal = createProposal();
    expectDomainError(() => proposal.requestInternalReview(context(1)), "VERSION_REQUIRED");
    prepareVersion(proposal);
    proposal.updateDraft({ title: "Unsaved edit" }, "2026-07-22T10:00:00.000Z");
    expectDomainError(() => proposal.requestInternalReview(context(2)), "VERSION_STALE");
  });

  it("supports Internal Review and authorized direct submission", () => {
    const reviewed = createProposal();
    prepareVersion(reviewed);
    reviewed.requestInternalReview(context(2));
    reviewed.submit(context(3), false);
    expect(reviewed.state.status).toBe("SUBMITTED");
    expect(reviewed.state.effectiveAt).toBe(context(3).occurredAt);

    const bypassed = createProposal();
    prepareVersion(bypassed);
    expectDomainError(() => bypassed.submit(context(2), false), "SUBMISSION_NOT_AUTHORIZED");
    bypassed.submit(context(3), true);
    expect(bypassed.state.status).toBe("SUBMITTED");
  });

  it("requires an authorized recipient and prevents stale Draft submission", () => {
    const proposal = createProposal();
    proposal.saveVersion({ versionId: "version-1" }, context(1));
    expectDomainError(() => proposal.submit(context(2), true), "AUTHORIZED_RECIPIENT_REQUIRED");

    const stale = createProposal();
    prepareVersion(stale);
    stale.updateDraft({ title: "Not versioned" }, "2026-07-22T10:00:00.000Z");
    expectDomainError(() => stale.submit(context(3), true), "VERSION_STALE");
  });

  it("records Client acceptance only from an authorized recipient", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    proposal.submit(context(2), true);
    expectDomainError(
      () =>
        proposal.acceptByRecipient(
          { acceptanceId: "acceptance-1", recipientId: "unknown" },
          context(3)
        ),
      "RECIPIENT_NOT_AUTHORIZED"
    );
    proposal.recordViewed(context(4));
    proposal.acceptByRecipient(
      { acceptanceId: "acceptance-1", recipientId: "recipient-1" },
      context(5)
    );

    expect(proposal.state.status).toBe("ACCEPTED");
    expect(proposal.state.acceptances.at(-1)).toEqual(
      expect.objectContaining({
        proposalVersionId: "version-1",
        acceptedFromStatus: "VIEWED",
        channel: "CLIENT_RECORDED"
      })
    );
  });

  it("requires complete immutable evidence for verbal acceptance", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    proposal.submit(context(2), true);
    expectDomainError(
      () =>
        proposal.recordVerbalAcceptance(
          {
            acceptanceId: "acceptance-1",
            recipientId: "recipient-1",
            reason: "",
            notes: ""
          },
          context(3)
        ),
      "ACCEPTANCE_EVIDENCE_REQUIRED"
    );
    proposal.recordVerbalAcceptance(
      {
        acceptanceId: "acceptance-1",
        recipientId: "recipient-1",
        reason: "Client approved during scheduled call",
        notes: "Confirmed scope, fee, and next step."
      },
      context(4)
    );
    expect(proposal.state.acceptances.at(-1)).toEqual(
      expect.objectContaining({
        responsibleUserId: "user-owner",
        reason: "Client approved during scheduled call",
        notes: "Confirmed scope, fee, and next step."
      })
    );
    expect(proposal.state.events.at(-1)?.eventType).toBe("PROPOSAL_VERBAL_ACCEPTANCE_RECORDED");
  });

  it("withdraws acceptance before Agreement execution but never edits acceptance history", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    proposal.submit(context(2), true);
    proposal.recordViewed(context(3));
    proposal.acceptByRecipient(
      { acceptanceId: "acceptance-1", recipientId: "recipient-1" },
      context(4)
    );
    const originalAcceptance = proposal.state.acceptances[0];
    proposal.withdrawAcceptance(
      { withdrawalId: "withdrawal-1", reason: "Client requested more time" },
      context(5)
    );

    expect(proposal.state.status).toBe("VIEWED");
    expect(proposal.state.acceptances).toEqual([originalAcceptance]);
    expect(proposal.state.currentAcceptanceId).toBeNull();
    expect(proposal.state.acceptanceWithdrawals).toHaveLength(1);
    proposal.acceptByRecipient(
      { acceptanceId: "acceptance-2", recipientId: "recipient-1" },
      context(6)
    );
    expect(proposal.state.acceptances).toHaveLength(2);
    expect(proposal.state.acceptances[0]).toEqual(originalAcceptance);
    expect(proposal.state.currentAcceptanceId).toBe("acceptance-2");

    const executed = createProposal();
    prepareVersion(executed);
    executed.submit(context(2), true);
    executed.acceptByRecipient(
      { acceptanceId: "acceptance-2", recipientId: "recipient-1" },
      context(3)
    );
    executed.linkExecutedAgreement("agreement-1", "2026-07-24T12:30:00.000Z");
    expectDomainError(
      () =>
        executed.withdrawAcceptance(
          { withdrawalId: "withdrawal-2", reason: "Too late" },
          context(5)
        ),
      "ACCEPTANCE_WITHDRAWAL_PROHIBITED"
    );
  });

  it("creates a new revision without mutating the submitted version or inheriting acceptance", () => {
    const proposal = createProposal();
    const first = prepareVersion(proposal);
    proposal.submit(context(2), true);
    proposal.acceptByRecipient(
      { acceptanceId: "acceptance-1", recipientId: "recipient-1" },
      context(3)
    );
    proposal.beginRevision("2026-07-24T10:00:00.000Z");
    proposal.updateDraft({ title: "Replacement offer" }, "2026-07-24T11:00:00.000Z");
    const second = proposal.saveVersion(
      { versionId: "version-2", revisionReason: "Client requested revised scope" },
      context(4)
    );
    proposal.submit(context(5), true);

    expect(first.draft.title).toBe("Operational improvement");
    expect(second.draft.title).toBe("Replacement offer");
    expect(proposal.state.submittedVersionId).toBe("version-2");
    expect(proposal.state.acceptances).toHaveLength(1);
    expect(proposal.state.currentAcceptanceId).toBeNull();
    expect(proposal.state.status).toBe("SUBMITTED");
  });

  it("enforces decline, expiration, supersession, and archive lifecycle rules", () => {
    const declined = createProposal();
    prepareVersion(declined);
    declined.submit(context(2), true);
    declined.decline(context(3));
    expect(declined.state.status).toBe("DECLINED");
    expect(declined.state.closedAt).toBe(context(3).occurredAt);
    declined.archive(context(4));
    expect(declined.state.status).toBe("ARCHIVED");

    const expired = createProposal();
    prepareVersion(expired);
    expired.submit(context(2), true);
    expectDomainError(
      () => expired.expire(context(3, "2026-08-01T12:00:00.000Z")),
      "EXPIRATION_INVALID"
    );
    expired.expire(context(4, "2026-08-20T12:00:00.000Z"));
    expect(expired.state.status).toBe("EXPIRED");

    const superseded = createProposal();
    prepareVersion(superseded);
    superseded.submit(context(2), true);
    superseded.supersede("proposal-2", context(3));
    expect(superseded.state.status).toBe("SUPERSEDED");
    expect(superseded.state.supersededByProposalId).toBe("proposal-2");
  });

  it("preserves Created, Effective, and Closed dates for distinct business purposes", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    proposal.submit(context(2), true);
    proposal.decline(context(3));

    expect(proposal.state.createdAt).toBe("2026-07-20T12:00:00.000Z");
    expect(proposal.state.effectiveAt).toBe(context(2).occurredAt);
    expect(proposal.state.closedAt).toBe(context(3).occurredAt);
    expect(
      new Set([proposal.state.createdAt, proposal.state.effectiveAt, proposal.state.closedAt]).size
    ).toBe(3);
  });

  it("retains append-only immutable business events for every material command", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    proposal.requestInternalReview(context(2));
    proposal.requestChanges(context(3));
    proposal.updateDraft({ title: "Reviewed offer" }, "2026-07-24T10:00:00.000Z");
    proposal.saveVersion({ versionId: "version-2" }, context(4));
    proposal.submit(context(5), true);
    proposal.recordViewed(context(6));

    expect(proposal.state.events.map(({ eventType }) => eventType)).toEqual([
      "PROPOSAL_CREATED",
      "PROPOSAL_VERSION_SAVED",
      "PROPOSAL_INTERNAL_REVIEW_REQUESTED",
      "PROPOSAL_CHANGES_REQUESTED",
      "PROPOSAL_VERSION_SAVED",
      "PROPOSAL_SUBMITTED",
      "PROPOSAL_VIEWED"
    ]);
    expect(proposal.state.events.every(Object.isFrozen)).toBe(true);
  });

  it("rejects duplicate event identities without partially changing business state", () => {
    const proposal = createProposal();
    prepareVersion(proposal);
    const before = proposal.state;

    expectDomainError(() => proposal.requestInternalReview(context(1)), "IDENTITY_INVALID");

    expect(proposal.state.status).toBe(before.status);
    expect(proposal.state.events).toEqual(before.events);
    expect(proposal.state.currentVersionId).toBe(before.currentVersionId);
  });
});
