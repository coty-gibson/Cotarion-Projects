import { describe, expect, it } from "vitest";
import { ProposalClientDecision } from "./proposal-client-decision";
describe("ProposalClientDecision", () => {
  it("retains immutable terminal evidence against one Delivery and artifact", () => {
    const source = { id: "decision-1", companyId: "company-1", proposalId: "proposal-1", proposalVersionId: "version-1", proposalRepresentationId: "representation-1", deliveryId: "delivery-1", outcome: "ACCEPTED" as const, decidedAt: "2026-07-21T12:00:00.000Z", actorType: "SECURE_LINK_CLIENT" as const, clientDisplayName: "Client", clientMessage: "Approved", internalNotes: null, correlationId: "correlation-1", requestIdentity: "request-1", createdAt: "2026-07-21T12:00:00.000Z" };
    const decision = ProposalClientDecision.record(source); source.clientMessage = "changed";
    expect(decision.state.clientMessage).toBe("Approved");
    expect(decision.state.deliveryId).toBe("delivery-1");
  });
});
