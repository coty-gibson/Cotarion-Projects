import {
  PRICING_PROJECT_STATUS_LABELS,
  type PricingProjectListItem
} from "@/application/pricing/pricing-workspace";
import { cn } from "@/lib/utils";

const statusClass = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-700",
  IN_REVIEW: "border-amber-300 bg-amber-50 text-amber-800",
  QUOTED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  ARCHIVED: "border-zinc-300 bg-zinc-100 text-zinc-600"
} as const;

export function PricingStatusBadge({ status }: { status: PricingProjectListItem["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        statusClass[status]
      )}
    >
      {PRICING_PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
