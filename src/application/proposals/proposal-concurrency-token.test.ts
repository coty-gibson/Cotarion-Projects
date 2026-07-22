import { describe, expect, it } from "vitest";
import {
  decodeProposalConcurrencyToken,
  encodeProposalConcurrencyToken,
  ProposalConcurrencyTokenError
} from "./proposal-concurrency-token";

describe("Proposal concurrency tokens", () => {
  it("round-trips repository revisions through an opaque transport value", () => {
    const token = encodeProposalConcurrencyToken(7);
    expect(token).not.toContain("7");
    expect(decodeProposalConcurrencyToken(token)).toBe(7);
  });

  it.each(["", "7", "not-base64", Buffer.from("proposal-concurrency-v1:0").toString("base64url")])(
    "rejects malformed or unsupported tokens: %s",
    (token) => {
      expect(() => decodeProposalConcurrencyToken(token)).toThrow(ProposalConcurrencyTokenError);
    }
  );
});
