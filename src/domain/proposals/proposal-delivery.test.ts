import { describe, expect, it } from "vitest";
import { ProposalDelivery, ProposalDeliveryDomainError, type ProposalDeliveryState } from "./proposal-delivery";

const state = (status: ProposalDeliveryState["status"] = "AVAILABLE"): ProposalDeliveryState => ({
  id: "delivery-1", companyId: "company-1", proposalId: "proposal-1", proposalVersionId: "version-1",
  proposalRepresentationId: "representation-1", representationType: "PDF", deliveryChannel: "SECURE_LINK",
  recipients: [{ name: "Client", email: "client@example.com", recipientRole: "DECISION_MAKER" }], status,
  requestedAt: "2026-07-21T12:00:00.000Z", requestedByUserId: "user-1", sentAt: null, failedAt: null,
  failureCode: null, failureMessage: null, externalProviderReference: null, correlationId: "correlation-1",
  deliveryAttemptNumber: 1, expiresAt: "2026-07-22T12:00:00.000Z", revokedAt: null,
  createdAt: "2026-07-21T12:00:00.000Z", updatedAt: "2026-07-21T12:00:00.000Z"
});

describe("ProposalDelivery", () => {
  it("permits only active, unexpired access and revokes authoritatively", () => {
    const delivery = ProposalDelivery.rehydrate(state());
    expect(delivery.permitsAccess("2026-07-22T11:59:59.000Z")).toBe(true);
    expect(delivery.permitsAccess("2026-07-22T12:00:00.000Z")).toBe(false);
    delivery.revoke("2026-07-21T13:00:00.000Z");
    expect(delivery.state.status).toBe("REVOKED");
    expect(delivery.permitsAccess("2026-07-21T13:01:00.000Z")).toBe(false);
    expect(() => delivery.revoke("2026-07-21T14:00:00.000Z")).toThrow(ProposalDeliveryDomainError);
  });

  it("expires only after the governed expiration", () => {
    const delivery = ProposalDelivery.rehydrate(state());
    expect(() => delivery.expire("2026-07-22T11:59:59.000Z")).toThrow(ProposalDeliveryDomainError);
    delivery.expire("2026-07-22T12:00:00.000Z");
    expect(delivery.state.status).toBe("EXPIRED");
  });
});
