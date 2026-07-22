import { describe, expect, it } from "vitest";
import {
  decodePricingConcurrencyToken,
  encodePricingConcurrencyToken,
  PricingConcurrencyTokenError
} from "@/application/pricing/pricing-concurrency-token";

describe("Pricing concurrency token", () => {
  it("round-trips deterministic versioned opaque tokens", () => {
    const token = encodePricingConcurrencyToken(42);
    expect(token).toBe(encodePricingConcurrencyToken(42));
    expect(token).not.toContain("revision");
    expect(decodePricingConcurrencyToken(token)).toBe(42);
  });

  it.each(["", "invalid", "cHJpY2luZy1jb25jdXJyZW5jeS12Mjoy", 1, null])(
    "rejects malformed token %s",
    (token) => expect(() => decodePricingConcurrencyToken(token)).toThrow(PricingConcurrencyTokenError)
  );
});
