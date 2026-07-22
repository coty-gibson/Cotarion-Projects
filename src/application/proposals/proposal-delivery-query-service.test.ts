import { describe, expect, it } from "vitest";
import { ProposalDeliveryQueryService } from "./proposal-delivery-query-service";
import { PROPOSAL_CAPABILITIES } from "./proposal-capabilities";
import type { ProposalDeliveryReadRecord, ProposalDeliveryRepository } from "./proposal-delivery-repository";

const identity = { id: "auth-1", email: "member@example.com", name: "Member" };
const record = (status: ProposalDeliveryReadRecord["status"], expiresAt = "2099-07-22T12:00:00.000Z"): ProposalDeliveryReadRecord => ({
  id: `delivery-${status}`, companyId: "company-1", proposalId: "proposal-1", proposalVersionId: "version-1", proposalRepresentationId: "representation-1", representationType: "HTML", deliveryChannel: "SECURE_LINK", recipients: [{ name: "Client", email: "client@example.com", recipientRole: null }], status, requestedAt: "2026-07-21T12:00:00.000Z", requestedByUserId: "user-1", sentAt: null, failedAt: null, failureCode: null, failureMessage: null, externalProviderReference: null, correlationId: "correlation-1", deliveryAttemptNumber: 1, expiresAt, revokedAt: null, createdAt: "2026-07-21T12:00:00.000Z", updatedAt: "2026-07-21T12:00:00.000Z", events: [], accesses: []
});
const repository = (records: ProposalDeliveryReadRecord[]): ProposalDeliveryRepository => ({
  representationSource: async () => { throw new Error("command path must not be used by CQRS queries"); },
  createOrReplay: async () => { throw new Error("command path must not be used by CQRS queries"); },
  detail: async (companyId, proposalId, deliveryId) => records.find((item) => item.companyId === companyId && item.proposalId === proposalId && item.id === deliveryId) ?? null,
  list: async (companyId, proposalId) => records.filter((item) => item.companyId === companyId && item.proposalId === proposalId),
  revoke: async () => { throw new Error("command path must not be used by CQRS queries"); },
  expire: async () => { throw new Error("command path must not be used by CQRS queries"); },
  resolveActiveAndRecordAccess: async () => { throw new Error("public path must not be used by internal CQRS queries"); }
});
function service(records: ProposalDeliveryReadRecord[], canRevoke: boolean) {
  return new ProposalDeliveryQueryService({ load: async () => ({ userId: "user-1", companyId: "company-1", active: true }) }, { capabilitiesFor: async () => new Set([PROPOSAL_CAPABILITIES.VIEW_DELIVERY, ...(canRevoke ? [PROPOSAL_CAPABILITIES.REVOKE_DELIVERY] : [])]) }, repository(records));
}

describe("ProposalDeliveryQueryService", () => {
  it("projects lifecycle- and capability-aware permitted actions from direct reads", async () => {
    const records = [record("AVAILABLE"), record("REVOKED"), record("AVAILABLE", "2020-01-01T00:00:00.000Z")];
    expect((await service(records, true).list(identity, "company-1", "proposal-1")).map((item) => item.permittedActions.revoke)).toEqual([true, false, false]);
    expect((await service(records, false).list(identity, "company-1", "proposal-1")).every((item) => !item.permittedActions.revoke)).toBe(true);
  });

  it("enforces viewing capability and Company scope before reading", async () => {
    const denied = new ProposalDeliveryQueryService({ load: async () => ({ userId: "user-1", companyId: "company-1", active: true }) }, { capabilitiesFor: async () => new Set() }, repository([]));
    await expect(denied.list(identity, "company-1", "proposal-1")).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(service([], true).list(identity, "company-2", "proposal-1")).rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" });
  });
});
