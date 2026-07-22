import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type {
  ProposalDetailDto,
  ProposalPermittedActionsDto,
  ProposalSummaryDto
} from "@/presentation/api/proposal-api-client";
import { availableProposalActions, ProposalDetailView } from "./proposal-detail-screen";
import { ProposalListTable } from "./proposal-list-screen";
import { ProposalRepresentationsPanel } from "./proposal-representations-panel";

const summary: ProposalSummaryDto = {
  id: "11111111-1111-4111-8111-111111111111",
  proposalNumber: "PRO-000001",
  companyId: "company-1",
  clientId: "client-1",
  ownerId: "owner-1",
  title: "Transformation program",
  status: "DRAFT",
  currentVersionNumber: 1,
  submittedVersionNumber: null,
  versionCount: 1,
  createdAt: "2026-07-20T12:00:00.000Z",
  updatedAt: "2026-07-21T12:00:00.000Z",
  effectiveAt: null,
  closedAt: null
};
const noActions: ProposalPermittedActionsDto = {
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

function detail(overrides: Partial<ProposalDetailDto> = {}): ProposalDetailDto {
  return {
    ...summary,
    engagementTypeCode: "PROJECT",
    currentVersionId: "version-1",
    submittedVersionId: null,
    supersedesProposalId: null,
    supersededByProposalId: null,
    executedAgreementId: null,
    expirationAt: "2026-09-01T10:00:00.000Z",
    draft: {
      title: summary.title,
      structuredContent: {
        schemaVersion: 1,
        title: summary.title,
        sections: [
          {
            sectionId: "section-1",
            sectionType: "EXECUTIVE_SUMMARY",
            heading: "Outcome",
            body: "Authoritative narrative",
            displayOrder: 1,
            clientVisible: true
          }
        ]
      },
      commercialTerms: {
        paymentSchedule: "Monthly",
        billingMethod: "Fixed fee",
        depositTerms: "None",
        recurrenceAndTerm: "Project",
        cancellationSummary: "Written notice",
        assumptionsAndExclusions: "As stated",
        clientResponsibilities: "Access",
        offerNotes: ""
      },
      recipients: [
        {
          recipientId: "recipient-1",
          contactId: null,
          name: "Client Contact",
          email: "client@example.com",
          authorizedToAccept: true
        }
      ],
      pricingSnapshot: {
        pricingProjectId: "pricing-1",
        pricingProjectNumber: "PP-000001",
        pricingModel: "PROJECT",
        methodologyVersion: "project/1",
        engineVersion: "1",
        pricingConfigurationVersion: 2,
        approvedAt: "2026-07-20T10:00:00.000Z",
        approvedByUserId: "reviewer-1",
        outputSnapshot: { finalAmount: "12500.00", currency: "USD" }
      },
      expirationAt: "2026-09-01T10:00:00.000Z",
      expirationOverrideReason: null
    },
    versions: [
      {
        id: "version-1",
        number: 1,
        status: "SAVED",
        createdAt: "2026-07-21T09:00:00.000Z",
        createdByUserId: "owner-1",
        revisionReason: "Initial",
        submittedAt: null,
        submittedByUserId: null
      }
    ],
    review: {
      status: "NOT_REQUESTED",
      requestedAt: null,
      requestedByUserId: null,
      reviewedAt: null,
      reviewedByUserId: null,
      outcome: null
    },
    executiveAuthorization: {
      status: "NOT_USED",
      submittedAt: null,
      submittedByUserId: null,
      authorizedAt: null,
      authorizedByUserId: null,
      businessJustification: null
    },
    acceptance: {
      viewedAt: null,
      acceptances: [],
      withdrawals: [],
      declinedAt: null,
      executedAgreementId: null
    },
    timeline: [
      {
        id: "event-1",
        type: "PROPOSAL_CREATED",
        occurredAt: summary.createdAt,
        actorUserId: "owner-1",
        label: "Proposal created",
        summary: "Server timeline evidence",
        versionId: null,
        relatedProposalId: null,
        agreementId: null
      }
    ],
    permittedActions: noActions,
    ...overrides,
    concurrencyToken: overrides.concurrencyToken ?? "proposal-token"
  };
}

describe("Proposal workspace screens", () => {
  it("keeps the Proposal list functional", () => {
    const markup = renderToStaticMarkup(
      <ProposalListTable
        hasPrevious={false}
        items={[summary]}
        nextCursor="next"
        onNext={() => undefined}
        onPrevious={() => undefined}
      />
    );
    expect(markup).toContain("PRO-000001");
    expect(markup).toContain("Transformation program");
    expect(markup).toContain(`href="/proposals/${summary.id}"`);
  });
  it("renders the expanded authoritative Draft, Pricing, evidence, and public server timeline", () => {
    const markup = renderToStaticMarkup(<ProposalDetailView proposal={detail()} />);
    expect(markup).toContain("Working Draft");
    expect(markup).toContain("Authoritative narrative");
    expect(markup).toContain("Pricing snapshot");
    expect(markup).toContain("12500.00");
    expect(markup).toContain("Immutable Versions");
    expect(markup).toContain("Quality Review");
    expect(markup).toContain("Executive Authorization");
    expect(markup).toContain("Server timeline evidence");
    expect(markup).not.toContain("Proposal business record created.");
  });
  it("renders Draft editing only from updateDraft", () => {
    expect(renderToStaticMarkup(<ProposalDetailView proposal={detail()} />)).not.toContain(
      "Edit working Draft"
    );
    const editable = detail({ permittedActions: { ...noActions, updateDraft: true } });
    expect(renderToStaticMarkup(<ProposalDetailView editingDraft proposal={editable} />)).toContain(
      "Save Draft"
    );
  });
  it("maps action visibility only from matching permittedActions values", () => {
    const submittedWithoutPermission = detail({ status: "SUBMITTED", permittedActions: noActions });
    expect(availableProposalActions(submittedWithoutPermission.permittedActions)).toEqual([]);
    const permitted = {
      ...noActions,
      saveVersion: true,
      submitThroughExecutiveAuthorization: true
    };
    expect(availableProposalActions(permitted).map(({ key }) => key)).toEqual([
      "saveVersion",
      "submitThroughExecutiveAuthorization"
    ]);
    const markup = renderToStaticMarkup(
      <ProposalDetailView proposal={detail({ permittedActions: permitted })} />
    );
    expect(markup).toContain("Save Version");
    expect(markup).toContain("Executive Authorization");
    expect(markup).not.toContain("Record Client acceptance");
  });
  it("renders minimal immutable Representation generation and history controls", () => {
    const markup = renderToStaticMarkup(<ProposalRepresentationsPanel companyId="company-1" proposal={detail({ permittedActions: { ...noActions, generateRepresentation: true } })} />);
    expect(markup).toContain("Representations");
    expect(markup).toContain("Generate HTML");
    expect(markup).toContain("Generate PDF");
    expect(markup).toContain("Representation history");
  });
});
