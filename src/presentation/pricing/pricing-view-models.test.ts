import { describe, expect, it } from "vitest";
import { PricingApiError } from "@/presentation/api/pricing-api-client";
import { mapPricingListRow, mapPricingReview, mapPricingVersion, pricingErrorMessage, pricingModelLabel, pricingStatusLabel } from "./pricing-view-models";

describe("Pricing presentation view models", () => {
  it("maps labels and display fallbacks without changing transport data", () => {
    expect(pricingModelLabel("PROFIT_SHARE_RETAINER")).toBe("Profit-Share Retainer"); expect(pricingStatusLabel("IN_REVIEW")).toBe("In Review");
    const row = mapPricingListRow({ id: "p", estimateNumber: "PP-1", client: { id: "c", name: "Acme", clientNumber: "C-1" }, owner: { id: "o", name: "Owner", email: "o@example.com" }, projectName: "Project", status: "DRAFT", pricingModel: "PROJECT", currentVersion: null, lastUpdated: "2026-07-21T12:00:00.000Z" });
    expect(row).toMatchObject({ clientLabel: "Acme · C-1", currentVersionLabel: "No Version", statusLabel: "Draft" });
  });
  it("maps authoritative Version and Review projection fields", () => {
    expect(mapPricingVersion({ id: "v", number: 1, createdAt: "2026-07-21T12:00:00.000Z", createdBy: { id: "o", name: "Owner" }, approvalStatus: "SAVED", reviewer: null, reviewedAt: null, revisionOriginVersionId: null })).toMatchObject({ reviewerLabel: "—", originLabel: "Original Version" });
    expect(mapPricingReview({ type: "REJECTED", pricingVersionId: "v", versionNumber: 1, actor: { id: "r", name: "Reviewer" }, findings: null, occurredAt: "2026-07-21T12:00:00.000Z" })).toMatchObject({ typeLabel: "Rejected", findingsLabel: "—" });
  });
  it.each([[400, "Check"], [401, "session"], [403, "permission"], [404, "not be found"], [409, "updated by another action"], [500, "temporarily unavailable"], [0, "temporarily unavailable"]])("maps HTTP %s to a safe user-facing error", (status, fragment) => {
    expect(pricingErrorMessage(new PricingApiError(status === 409 ? "OPTIMISTIC_CONCURRENCY_CONFLICT" : "ERROR", status === 400 ? "Check the fields" : "private", status as number, "id"))).toContain(fragment);
  });
});
