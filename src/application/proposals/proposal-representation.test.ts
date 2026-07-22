import { describe, expect, it } from "vitest";
import type { ProposalVersionRepresentationSource } from "./proposal-representation";
import { ProposalRepresentationRenderer } from "@/infrastructure/proposal-representations/proposal-representation-renderer";

const renderer = new ProposalRepresentationRenderer();
const generateProposalRepresentation = (source: ProposalVersionRepresentationSource, type: "HTML" | "PDF") => renderer.render(source, type);

function source(version = 1, title = `Proposal Version ${version}`): ProposalVersionRepresentationSource {
  return {
    companyId: "company-1", proposalId: "proposal-1", proposalNumber: "PRO-000001",
    proposalVersionId: `version-${version}`, proposalVersionNumber: version,
    draft: {
      title, engagementTypeCode: "PROJECT", engagementTypePolicyVersion: 1,
      expirationAt: "2026-09-01T00:00:00.000Z", expirationOverrideReason: null,
      content: { schemaVersion: 1, title, sections: [{ sectionId: "s1", sectionType: "EXECUTIVE_SUMMARY", heading: "Outcome", body: "Immutable evidence", displayOrder: 1, clientVisible: true }] },
      commercialTerms: { paymentSchedule: "Monthly", billingMethod: "Fixed", depositTerms: "None", recurrenceAndTerm: "Project", cancellationSummary: "Notice", assumptionsAndExclusions: "Recorded", clientResponsibilities: "Access", offerNotes: "" },
      recipients: []
    },
    pricingSnapshot: { schemaVersion: 2, pricingProjectId: "pricing-1", pricingVersionId: `pricing-version-${version}`, pricingVersionNumber: version, pricingProjectNumber: "EST-1", companyId: "company-1", clientId: "client-1", operatingGroupCode: "CONSULTING", sourceStatus: "QUOTED", pricingConfigurationVersionId: "configuration-1", pricingConfigurationVersion: 1, engineVersion: "engine/1", pricingModel: "PROJECT", methodologyVersion: "project/1", inputSnapshot: {}, outputSnapshot: { pricingModel: "PROJECT", methodologyVersion: "project/1", projectSubtotal: "100.00", complexityMultiplier: "1", adjustedSubtotal: "100.00", discountRate: "0", discountAmount: "0.00", finalAmount: `${version}00.00`, currency: "USD" }, approvedAt: "2026-07-20T00:00:00.000Z", approvedByUserId: "reviewer-1", capturedAt: "2026-07-20T00:01:00.000Z" }
  };
}

describe("Proposal representation generation", () => {
  it.each(["HTML", "PDF"] as const)("generates deterministic %s bytes and checksums", (type) => {
    const first = generateProposalRepresentation(source(), type);
    const second = generateProposalRepresentation(source(), type);
    expect(first.content).toEqual(second.content);
    expect(first.contentChecksum).toBe(second.contentChecksum);
  });

  it("binds HTML and PDF metadata to the same immutable Proposal and Pricing Versions", () => {
    const html = generateProposalRepresentation(source(), "HTML");
    const pdf = generateProposalRepresentation(source(), "PDF");
    expect(html.metadata).toMatchObject({ proposalVersionId: "version-1", pricingVersionId: "pricing-version-1" });
    expect(pdf.metadata).toMatchObject({ proposalVersionId: "version-1", pricingVersionId: "pricing-version-1" });
    expect(Buffer.from(html.content).toString()).toContain('data-proposal-version-id="version-1"');
    expect(Buffer.from(pdf.content).subarray(0, 8).toString()).toBe("%PDF-1.4");
  });

  it("keeps different Proposal Versions materially and cryptographically independent", () => {
    const first = generateProposalRepresentation(source(1), "HTML");
    const retained = Buffer.from(first.content);
    const second = generateProposalRepresentation(source(2), "HTML");
    expect(second.contentChecksum).not.toBe(first.contentChecksum);
    expect(Buffer.from(first.content)).toEqual(retained);
    expect(first.metadata.proposalVersionId).toBe("version-1");
    expect(second.metadata.proposalVersionId).toBe("version-2");
  });
});
