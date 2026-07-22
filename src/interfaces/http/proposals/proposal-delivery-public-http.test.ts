import { describe, expect, it, vi } from "vitest";
import { handlePublicProposalDelivery } from "./proposal-delivery-public-http";

describe("public Proposal Delivery HTTP boundary", () => {
  it("returns exact immutable bytes with safe headers and no internal identifiers", async () => {
    const bytes = new TextEncoder().encode("immutable-representation");
    const service = { resolve: vi.fn().mockResolvedValue({ title: "Client Proposal", proposalNumber: "PROP-0001", proposalVersionNumber: 3, representationType: "PDF", contentType: "application/pdf", content: bytes, expiresAt: "2026-07-22T12:00:00.000Z" }) };
    const response = await handlePublicProposalDelivery(new Request("https://example.test/link"), "a".repeat(43), service as never, () => new Date("2026-07-21T12:00:00.000Z"), () => "correlation-1");
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toContain("PROP-0001-v3.pdf");
    expect([...response.headers.keys()].join(" ")).not.toMatch(/company|representation-id|proposal-id|revision/);
  });

  it("uses one indistinguishable response for invalid, expired, revoked, and failed resolution", async () => {
    const service = { resolve: vi.fn().mockResolvedValue(null) };
    const response = await handlePublicProposalDelivery(new Request("https://example.test/link"), "invalid", service as never);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "Secure Proposal link is unavailable." } });
  });

  it("does not expose a mutation surface", async () => {
    const service = { resolve: vi.fn() };
    const response = await handlePublicProposalDelivery(new Request("https://example.test/link", { method: "POST" }), "a".repeat(43), service as never);
    expect(response.status).toBe(404);
    expect(service.resolve).not.toHaveBeenCalled();
  });
});
