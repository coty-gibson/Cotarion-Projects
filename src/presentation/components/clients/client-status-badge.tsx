import {
  CLIENT_STATUS_LABELS,
  type ClientStatus
} from "@/application/clients/client";
import { cn } from "@/lib/utils";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        status === "ACTIVE_CLIENT" && "bg-emerald-100 text-emerald-800",
        status === "PROSPECT" && "bg-blue-100 text-blue-800",
        status === "INACTIVE" && "bg-slate-100 text-slate-700"
      )}
    >
      {CLIENT_STATUS_LABELS[status]}
    </span>
  );
}
