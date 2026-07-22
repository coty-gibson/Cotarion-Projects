import { describe, expect, it } from "vitest";
import {
  ProposalNumber,
  ProposalTitle,
  ProposalValueError,
  ProposalVersionNumber
} from "@/domain/proposals/proposal-value-objects";

describe("Proposal value objects", () => {
  it("normalizes and compares permanent Proposal numbers", () => {
    const number = ProposalNumber.create("  PRO-000001  ");
    expect(number.value).toBe("PRO-000001");
    expect(number.equals(ProposalNumber.create("PRO-000001"))).toBe(true);
    expect(number.toString()).toBe("PRO-000001");
  });

  it("rejects malformed Proposal numbers", () => {
    expect(() => ProposalNumber.create("EST-000001")).toThrow(ProposalValueError);
    expect(() => ProposalNumber.create("PRO-1")).toThrow(ProposalValueError);
  });

  it("normalizes non-empty Proposal titles", () => {
    const title = ProposalTitle.create("  Operational improvement  ");
    expect(title.value).toBe("Operational improvement");
    expect(title.equals(ProposalTitle.create("Operational improvement"))).toBe(true);
    expect(() => ProposalTitle.create("   ")).toThrow(ProposalValueError);
  });

  it("requires positive sequential Proposal Version numbers", () => {
    const first = ProposalVersionNumber.create(1);
    expect(first.next().value).toBe(2);
    expect(first.toString()).toBe("1");
    expect(() => ProposalVersionNumber.create(0)).toThrow(ProposalValueError);
    expect(() => ProposalVersionNumber.create(1.5)).toThrow(ProposalValueError);
  });
});
