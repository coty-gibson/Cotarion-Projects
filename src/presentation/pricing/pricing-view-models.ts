import type { PricingApiError, PricingDetailDto, PricingEditableDto, PricingModel, PricingReviewDto, PricingStatus, PricingSummaryDto, PricingVersionDto } from "@/presentation/api/pricing-api-client";

const models: Record<PricingModel, string> = { PROJECT: "Project", FIXED_RETAINER: "Fixed Retainer", PROFIT_SHARE_RETAINER: "Profit-Share Retainer", HYBRID_RETAINER: "Hybrid Retainer", ADVISORY_HOURLY: "Advisory Consulting" };
const statuses: Record<PricingStatus, string> = { DRAFT: "Draft", IN_REVIEW: "In Review", QUOTED: "Quoted", ARCHIVED: "Archived" };
export const pricingModelLabel = (value: PricingModel) => models[value];
export const pricingStatusLabel = (value: PricingStatus) => statuses[value];
export const formatPricingDate = (value: string | null) => value ? new Date(value).toLocaleString() : "—";
export const mapPricingListRow = (item: PricingSummaryDto) => ({ ...item, clientLabel: `${item.client.name} · ${item.client.clientNumber}`, ownerLabel: item.owner.name, statusLabel: pricingStatusLabel(item.status), pricingModelLabel: pricingModelLabel(item.pricingModel), currentVersionLabel: item.currentVersion ? `Version ${item.currentVersion.number}` : "No Version", lastUpdatedLabel: formatPricingDate(item.lastUpdated) });
export const mapPricingDetail = (item: PricingDetailDto) => ({ ...item, summary: mapPricingListRow(item.summary), draftUpdatedLabel: formatPricingDate(item.draft.lastUpdated) });
export const mapEditablePricingDraft = (item: PricingEditableDto) => ({ ...item, clientLabel: `${item.client.name} · ${item.client.clientNumber}`, ownerLabel: `${item.owner.name} · ${item.owner.email}` });
export const mapPricingVersion = (item: PricingVersionDto) => ({ ...item, createdLabel: formatPricingDate(item.createdAt), reviewedLabel: formatPricingDate(item.reviewedAt), reviewerLabel: item.reviewer?.name ?? "—", originLabel: item.revisionOriginVersionId ?? "Original Version" });
export const mapPricingReview = (item: PricingReviewDto) => ({ ...item, occurredLabel: formatPricingDate(item.occurredAt), typeLabel: item.type[0] + item.type.slice(1).toLowerCase(), findingsLabel: item.findings ?? "—" });
export function pricingErrorMessage(error: unknown) {
  const current = error as PricingApiError;
  if (!current || typeof current !== "object" || !("status" in current)) return "Pricing could not complete the request. Please try again.";
  if (current.status === 400) return current.message || "Check the information provided and try again.";
  if (current.status === 401) return "Your session has ended. Sign in again to continue.";
  if (current.status === 403) return "You do not have permission to perform this Pricing action.";
  if (current.status === 404) return "This Pricing Project could not be found.";
  if (current.status === 409) return current.code === "OPTIMISTIC_CONCURRENCY_CONFLICT" ? "This Pricing Project was updated by another action. Reload the latest version before continuing." : current.message;
  return "Pricing is temporarily unavailable. Your changes were not submitted.";
}
