import { describe, expect, it } from "vitest";
import { PROPOSAL_CAPABILITIES } from "@/application/proposals/proposal-capabilities";
import {
  projectAcceptance,
  projectExecutiveAuthorization,
  projectPermittedActions,
  projectReview,
  projectTimeline
} from "@/application/proposals/proposal-workspace-projection";
import { PRICING_SNAPSHOT_SCHEMA_VERSION } from "@/domain/proposals/contracts";
import { engagementTypePolicy } from "@/domain/proposals/engagement-type-policies";
import { ProposalAggregate } from "@/domain/proposals/proposal-domain";

function context(sequence: number, userId = "user-1") {
  return { eventId: `event-${sequence}`, occurredAt: `2026-07-${String(21 + sequence).padStart(2, "0")}T10:00:00.000Z`, responsibleUserId: userId };
}

function proposal(id = "proposal-1") {
  return ProposalAggregate.create({
    id,
    proposalNumber: "PRO-000001",
    companyId: "company-1",
    clientId: "client-1",
    ownerId: "user-1",
    engagementTypePolicy: engagementTypePolicy("PROJECT"),
    pricingSnapshot: {
      schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
      pricingProjectId: "pricing-1", pricingProjectNumber: "PP-000001", companyId: "company-1", clientId: "client-1", operatingGroupCode: "CONSULTING", sourceStatus: "QUOTED", pricingConfigurationVersionId: "configuration-1", pricingConfigurationVersion: 1, engineVersion: "1", pricingModel: "PROJECT", methodologyVersion: "project-pricing/1.0.0", inputSnapshot: { confidentialInput: "not-timeline-safe" }, outputSnapshot: { pricingModel: "PROJECT", methodologyVersion: "project-pricing/1.0.0", projectSubtotal: "1.00", complexityMultiplier: "1", adjustedSubtotal: "1.00", discountRate: "0", discountAmount: "0.00", finalAmount: "1.00", currency: "USD" }, approvedAt: "2026-07-20T10:00:00.000Z", approvedByUserId: "reviewer-1", capturedAt: "2026-07-20T10:01:00.000Z"
    },
    title: "Workspace Proposal",
    expirationAt: "2026-09-01T10:00:00.000Z",
    expirationOverrideReason: "Client requested a longer review period"
  }, context(0));
}

function versioned() {
  const aggregate = proposal();
  aggregate.updateDraft({
    content: { schemaVersion: 1, title: "Workspace Proposal", sections: [{ sectionId: "section-1", sectionType: "EXECUTIVE_SUMMARY", heading: "Summary", body: "Sensitive draft narrative", displayOrder: 1, clientVisible: true }] },
    recipients: [{ recipientId: "recipient-1", contactId: null, name: "Client", email: "client@example.com", authorizedToAccept: true }]
  }, context(1).occurredAt);
  aggregate.saveVersion({ versionId: "version-1", revisionReason: "Initial review" }, context(2));
  return aggregate;
}

describe("Proposal workspace projections", () => {
  it("projects existing Quality Review evidence without inventing comments or assignment", () => {
    const aggregate = versioned();
    aggregate.requestQualityReview(context(3));
    aggregate.requestChanges(context(4, "reviewer-1"));
    expect(projectReview(aggregate.state)).toEqual({
      status: "CHANGES_REQUESTED",
      requestedAt: context(3).occurredAt,
      requestedByUserId: "user-1",
      reviewedAt: context(4, "reviewer-1").occurredAt,
      reviewedByUserId: "reviewer-1",
      outcome: "CHANGES_REQUESTED"
    });
  });

  it("projects executive-path submission evidence and immutable version identity", () => {
    const aggregate = versioned();
    aggregate.submit(context(3, "admin-1"), { method: "EXECUTIVE_AUTHORIZATION", authorizedByUserId: "admin-1", businessJustification: "Urgent client commitment" });
    expect(projectExecutiveAuthorization(aggregate.state)).toMatchObject({ status: "AUTHORIZED_AND_SUBMITTED", authorizedByUserId: "admin-1", businessJustification: "Urgent client commitment" });
    expect(aggregate.state.submittedVersionId).toBe("version-1");
  });

  it("projects acceptance and withdrawal as distinct evidence", () => {
    const aggregate = versioned();
    aggregate.submit(context(3, "admin-1"), { method: "EXECUTIVE_AUTHORIZATION", authorizedByUserId: "admin-1", businessJustification: "Approved path" });
    aggregate.recordViewed(context(4));
    aggregate.recordVerbalAcceptance({ acceptanceId: "acceptance-1", recipientId: "recipient-1", reason: "Call", notes: "Confirmed on call" }, context(5));
    aggregate.withdrawAcceptance({ withdrawalId: "withdrawal-1", reason: "Correction" }, context(6));
    expect(projectAcceptance(aggregate.state)).toMatchObject({ viewedAt: context(4).occurredAt, executedAgreementId: null });
    expect(projectAcceptance(aggregate.state).acceptances[0]).toMatchObject({ channel: "VERBAL_RECORDED", current: false });
    expect(projectAcceptance(aggregate.state).withdrawals[0]).toMatchObject({ reason: "Correction" });
  });

  it("maps internal history to stable, ordered, safe timeline items", () => {
    const aggregate = versioned();
    aggregate.submit(context(3, "admin-1"), { method: "EXECUTIVE_AUTHORIZATION", authorizedByUserId: "admin-1", businessJustification: "Sensitive justification" });
    const timeline = projectTimeline(aggregate.state);
    expect(timeline.map(({ type }) => type)).toEqual(["PROPOSAL_CREATED", "VERSION_SAVED", "SUBMITTED_EXECUTIVE_AUTHORIZATION"]);
    expect(timeline.map(({ occurredAt }) => occurredAt)).toEqual([...timeline.map(({ occurredAt }) => occurredAt)].sort());
    const serialized = JSON.stringify(timeline);
    expect(serialized).not.toContain("metadata");
    expect(serialized).not.toContain("Sensitive draft narrative");
    expect(serialized).not.toContain("confidentialInput");
    expect(serialized).not.toContain("Sensitive justification");
  });

  it("intersects Company-scoped capabilities with authoritative Proposal state", () => {
    const aggregate = versioned();
    const memberCapabilities = new Set([PROPOSAL_CAPABILITIES.EDIT_DRAFT, PROPOSAL_CAPABILITIES.SAVE_VERSION, PROPOSAL_CAPABILITIES.REQUEST_REVIEW]);
    const member = projectPermittedActions(aggregate.state, { userId: "user-1", companyId: "company-1", active: true }, memberCapabilities);
    expect(member).toMatchObject({ updateDraft: true, requestQualityReview: true, submitThroughExecutiveAuthorization: false, requestChanges: false });
    aggregate.requestQualityReview(context(3));
    const reviewer = projectPermittedActions(aggregate.state, { userId: "reviewer-1", companyId: "company-1", active: true }, new Set([PROPOSAL_CAPABILITIES.QUALITY_REVIEW]));
    expect(reviewer).toMatchObject({ updateDraft: false, requestChanges: true, submitThroughQualityReview: true });
    const creator = projectPermittedActions(aggregate.state, { userId: "user-1", companyId: "company-1", active: true }, new Set([PROPOSAL_CAPABILITIES.QUALITY_REVIEW]));
    expect(creator.submitThroughQualityReview).toBe(false);
  });

  it("advertises version-dependent actions only while the current Version represents the working Draft", () => {
    const aggregate = versioned();
    const capabilities = new Set([
      PROPOSAL_CAPABILITIES.REQUEST_REVIEW,
      PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE
    ]);
    const actor = { userId: "user-1", companyId: "company-1", active: true };

    expect(projectPermittedActions(aggregate.state, actor, capabilities)).toMatchObject({
      requestQualityReview: true,
      submitThroughExecutiveAuthorization: true
    });

    aggregate.updateDraft({ title: "Unsaved Draft edit" }, context(3).occurredAt);
    expect(projectPermittedActions(aggregate.state, actor, capabilities)).toMatchObject({
      requestQualityReview: false,
      submitThroughExecutiveAuthorization: false
    });

    aggregate.saveVersion({ versionId: "version-2", revisionReason: "Draft updated" }, context(4));
    expect(projectPermittedActions(aggregate.state, actor, capabilities)).toMatchObject({
      requestQualityReview: true,
      submitThroughExecutiveAuthorization: true
    });
  });

  it("projects foundation actions from lifecycle, capability, Company, and reviewer independence", () => {
    const aggregate = versioned();
    aggregate.requestQualityReview(context(3));
    const executiveCapabilities = new Set([PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE]);
    const creator = { userId: "user-1", companyId: "company-1", active: true };
    const independent = { userId: "executive-1", companyId: "company-1", active: true };
    expect(projectPermittedActions(aggregate.state, creator, executiveCapabilities).submitForExecutiveAuthorization).toBe(false);
    expect(projectPermittedActions(aggregate.state, independent, executiveCapabilities)).toMatchObject({
      submitForExecutiveAuthorization: true,
      approve: false
    });

    aggregate.submitForExecutiveAuthorization(context(4, "executive-1"));
    expect(projectPermittedActions(aggregate.state, independent, executiveCapabilities)).toMatchObject({
      submitForExecutiveAuthorization: false,
      approve: true
    });
    expect(projectPermittedActions(
      aggregate.state,
      independent,
      new Set([PROPOSAL_CAPABILITIES.QUALITY_REVIEW])
    ).reject).toBe(true);
    expect(projectPermittedActions(
      aggregate.state,
      { ...independent, companyId: "company-2" },
      executiveCapabilities
    ).approve).toBe(false);
  });
});
