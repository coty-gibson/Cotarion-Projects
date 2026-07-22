import { describe, expect, it } from "vitest";
import { HmacProposalDeliveryTokenIssuer } from "./hmac-proposal-delivery-token-issuer";

describe("HmacProposalDeliveryTokenIssuer", () => {
  const issuer = new HmacProposalDeliveryTokenIssuer("a-strong-secret-with-more-than-thirty-two-bytes");

  it("issues deterministic, opaque, cryptographically strong tokens and irreversible verifiers", () => {
    const first = issuer.issue("company-1", "request-1");
    const replay = issuer.issue("company-1", "request-1");
    const distinct = issuer.issue("company-1", "request-2");
    expect(first).toEqual(replay);
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toContain("company-1");
    expect(first.token).not.toContain("request-1");
    expect(first.digest).toHaveLength(64);
    expect(first.digest).not.toBe(first.token);
    expect(distinct.token).not.toBe(first.token);
  });

  it("rejects secrets that cannot safely protect client links", () => {
    expect(() => new HmacProposalDeliveryTokenIssuer("short-secret")).toThrow(/32 bytes/);
  });
});
