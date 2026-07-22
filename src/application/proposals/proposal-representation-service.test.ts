import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { PROPOSAL_CAPABILITIES } from "./proposal-capabilities";
import type { ProposalRepresentationRepository, ProposalRepresentationRecord } from "./proposal-representation-repository";
import { ProposalRepresentationService } from "./proposal-representation-service";
import { ProposalRepresentationRenderer } from "@/infrastructure/proposal-representations/proposal-representation-renderer";

const identity: AuthenticatedIdentity = { id: "auth-1", email: "member@example.com", name: "Member" };

function repository(): ProposalRepresentationRepository & { records: ProposalRepresentationRecord[] } {
  const records: ProposalRepresentationRecord[] = [];
  return {
    records,
    async findVersionSource(companyId, proposalId, proposalVersionId) {
      if (companyId !== "company-1" || proposalId !== "proposal-1") return null;
      return { companyId, proposalId, proposalNumber: "PRO-1", proposalVersionId, proposalVersionNumber: Number(proposalVersionId.at(-1)), draft: { title: `Version ${proposalVersionId.at(-1)}`, engagementTypeCode: "PROJECT", engagementTypePolicyVersion: 1, expirationAt: "2026-09-01T00:00:00.000Z", expirationOverrideReason: null, content: { schemaVersion: 1, title: "Proposal", sections: [] }, commercialTerms: { paymentSchedule: "Monthly", billingMethod: "Fixed", depositTerms: "", recurrenceAndTerm: "", cancellationSummary: "", assumptionsAndExclusions: "", clientResponsibilities: "", offerNotes: "" }, recipients: [] }, pricingSnapshot: { outputSnapshot: { currency: "USD", finalAmount: "100.00" } } as never };
    },
    async insertOrGet(input) {
      const existing = records.find(({ id }) => id === input.id);
      if (existing) return { record: existing, idempotentReplay: true };
      const record = { ...input, proposalVersionNumber: Number(input.proposalVersionId.at(-1)) } as ProposalRepresentationRecord;
      records.push(record); return { record, idempotentReplay: false };
    },
    async list(companyId, proposalId, versionId) { return records.filter((item) => item.companyId === companyId && item.proposalId === proposalId && (!versionId || item.proposalVersionId === versionId)); },
    async detail(companyId, proposalId, id) { return records.find((item) => item.companyId === companyId && item.proposalId === proposalId && item.id === id) ?? null; },
    async current() { return records.at(-1) ?? null; }
  };
}

describe("Proposal Representation service", () => {
  it("is idempotent per immutable Version and type while retaining independent Version history", async () => {
    const store = repository();
    const infrastructureRenderer = new ProposalRepresentationRenderer();
    const renderer = { render: vi.fn(infrastructureRenderer.render.bind(infrastructureRenderer)) };
    const service = new ProposalRepresentationService(
      { load: async () => ({ userId: "member-1", companyId: "company-1", active: true }) },
      { capabilitiesFor: async () => new Set([PROPOSAL_CAPABILITIES.GENERATE_REPRESENTATION]) },
      store,
      renderer
    );
    const command = { proposalId: "proposal-1", proposalVersionId: "version-1", representationType: "HTML" as const, generatedAt: "2026-07-21T12:00:00.000Z" };
    expect((await service.generate(identity, "company-1", command)).idempotentReplay).toBe(false);
    expect((await service.generate(identity, "company-1", { ...command, generatedAt: "2026-07-22T12:00:00.000Z" })).idempotentReplay).toBe(true);
    await service.generate(identity, "company-1", { ...command, proposalVersionId: "version-2" });
    expect(store.records).toHaveLength(2);
    expect(renderer.render).toHaveBeenCalledWith(expect.objectContaining({ proposalVersionId: "version-1" }), "HTML");
    expect(store.records.map(({ proposalVersionId }) => proposalVersionId)).toEqual(["version-1", "version-2"]);
  });

  it("enforces active Company-scoped capability authority", async () => {
    const denied = new ProposalRepresentationService(
      { load: async () => ({ userId: "member-1", companyId: "company-1", active: true }) },
      { capabilitiesFor: async () => new Set() }, repository(), new ProposalRepresentationRenderer()
    );
    await expect(denied.generate(identity, "company-1", { proposalId: "proposal-1", proposalVersionId: "version-1", representationType: "PDF", generatedAt: "2026-07-21T12:00:00.000Z" })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(denied.generate(identity, "company-2", { proposalId: "proposal-1", proposalVersionId: "version-1", representationType: "PDF", generatedAt: "2026-07-21T12:00:00.000Z" })).rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" });
  });
});
