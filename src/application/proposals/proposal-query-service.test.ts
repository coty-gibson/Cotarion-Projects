import { describe, expect, it } from "vitest";
import { ProposalQueryService } from "@/application/proposals/proposal-query-service";
import { PROPOSAL_CAPABILITIES } from "@/application/proposals/proposal-capabilities";
import type { ProposalReadRepository } from "@/application/proposals/proposal-repository";
import { PRICING_SNAPSHOT_SCHEMA_VERSION } from "@/domain/proposals/contracts";
import { engagementTypePolicy } from "@/domain/proposals/engagement-type-policies";
import { ProposalAggregate } from "@/domain/proposals/proposal-domain";

const identity = { id: "auth-1", email: "user@example.com" };
const aggregate = ProposalAggregate.create(
  {
    id: "proposal-1",
    proposalNumber: "PRO-000001",
    companyId: "company-1",
    clientId: "client-1",
    ownerId: "user-1",
    engagementTypePolicy: engagementTypePolicy("PROJECT"),
    pricingSnapshot: {
      schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
      pricingProjectId: "pricing-1",
      pricingProjectNumber: "PP-000001",
      companyId: "company-1",
      clientId: "client-1",
      operatingGroupCode: "CONSULTING",
      sourceStatus: "QUOTED",
      pricingConfigurationVersionId: "configuration-1",
      pricingConfigurationVersion: 1,
      engineVersion: "1",
      pricingModel: "PROJECT",
      methodologyVersion: "project-pricing/1.0.0",
      inputSnapshot: {},
      outputSnapshot: { pricingModel: "PROJECT", methodologyVersion: "project-pricing/1.0.0", projectSubtotal: "1.00", complexityMultiplier: "1", adjustedSubtotal: "1.00", discountRate: "0", discountAmount: "0.00", finalAmount: "1.00", currency: "USD" },
      approvedAt: "2026-07-20T10:00:00.000Z",
      approvedByUserId: "reviewer-1",
      capturedAt: "2026-07-20T10:01:00.000Z"
    },
    title: "Query Proposal"
  },
  { eventId: "event-created", occurredAt: "2026-07-21T10:00:00.000Z", responsibleUserId: "user-1" }
);

function repository(): ProposalReadRepository {
  return {
    async detail(companyId, proposalId) {
      return companyId === "company-1" && proposalId === "proposal-1"
        ? { state: aggregate.persistenceState, revision: 1 }
        : null;
    },
    async list(companyId, request) {
      if (companyId !== "company-1") return { items: [], nextCursor: null };
      const items = [
        { id: "proposal-2", proposalNumber: "PRO-000002", companyId, clientId: "client-2", ownerId: "user-2", title: "Second", status: "SUBMITTED", currentVersionNumber: 1, submittedVersionNumber: 1, versionCount: 1, createdAt: "2026-07-21T11:00:00.000Z", updatedAt: "2026-07-21T11:00:00.000Z", effectiveAt: "2026-07-21T11:00:00.000Z", closedAt: null },
        { id: "proposal-1", proposalNumber: "PRO-000001", companyId, clientId: "client-1", ownerId: "user-1", title: "First", status: "DRAFT", currentVersionNumber: null, submittedVersionNumber: null, versionCount: 0, createdAt: "2026-07-21T10:00:00.000Z", updatedAt: "2026-07-21T10:00:00.000Z", effectiveAt: null, closedAt: null }
      ].filter((item) =>
        (!request.filter?.status || item.status === request.filter.status) &&
        (!request.filter?.clientId || item.clientId === request.filter.clientId) &&
        (!request.filter?.ownerId || item.ownerId === request.filter.ownerId)
      );
      return { items: items.slice(0, request.limit), nextCursor: items.length > request.limit ? "next" : null };
    }
  };
}

function queries(options?: { active?: boolean; companyId?: string; known?: boolean }) {
  return new ProposalQueryService(
    { load: async () => options?.known === false ? null : ({ userId: "user-1", companyId: options?.companyId ?? "company-1", active: options?.active ?? true }) },
    repository(),
    { capabilitiesFor: async () => new Set(Object.values(PROPOSAL_CAPABILITIES)) }
  );
}

describe("Proposal query service", () => {
  it("loads a serialization-safe Company-scoped Proposal detail", async () => {
    const result = await queries().load(identity, "company-1", "proposal-1");
    expect(result).toMatchObject({
      id: "proposal-1",
      title: "Query Proposal",
      versionCount: 0,
      draft: { title: "Query Proposal", pricingSnapshot: { pricingProjectId: "pricing-1" } },
      review: { status: "NOT_REQUESTED" },
      executiveAuthorization: { status: "NOT_USED" },
      acceptance: { acceptances: [], withdrawals: [] },
      permittedActions: { updateDraft: true }
    });
    expect(result.timeline.map(({ type }) => type)).toEqual(["PROPOSAL_CREATED"]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("distinguishes not found, unknown, inactive, and cross-Company actors", async () => {
    await expect(queries().load(identity, "company-1", "missing")).rejects.toMatchObject({ code: "PROPOSAL_NOT_FOUND" });
    await expect(queries({ known: false }).list(identity, "company-1")).rejects.toMatchObject({ code: "NOT_AUTHENTICATED" });
    await expect(queries({ active: false }).list(identity, "company-1")).rejects.toMatchObject({ code: "NOT_AUTHENTICATED" });
    await expect(queries({ companyId: "company-2" }).list(identity, "company-1")).rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" });
  });

  it("supports approved filters without adding search behavior", async () => {
    expect((await queries().list(identity, "company-1", { filter: { status: "DRAFT" } })).items).toHaveLength(1);
    expect((await queries().list(identity, "company-1", { filter: { clientId: "client-2" } })).items[0].id).toBe("proposal-2");
    expect((await queries().list(identity, "company-1", { filter: { ownerId: "user-1" } })).items[0].id).toBe("proposal-1");
  });

  it("passes deterministic pagination through the repository boundary", async () => {
    const page = await queries().list(identity, "company-1", { limit: 1 });
    expect(page.items.map(({ id }) => id)).toEqual(["proposal-2"]);
    expect(page.nextCursor).toBe("next");
  });

  it("rejects invalid pagination before repository access", async () => {
    await expect(queries().list(identity, "company-1", { limit: 0 })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(queries().list(identity, "company-1", { cursor: " " })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
