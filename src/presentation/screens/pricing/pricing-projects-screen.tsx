import type { ReactNode } from "react";
import Link from "next/link";
import type { PricingProjectListItem } from "@/application/pricing/pricing-workspace";
import { PricingStatusBadge } from "@/presentation/components/pricing/pricing-status-badge";

export function PricingProjectsScreen({
  action,
  projects
}: {
  action: ReactNode;
  projects: PricingProjectListItem[];
}) {
  const modelLabels = {
    PROJECT: "Project",
    FIXED_RETAINER: "Fixed Retainer",
    PROFIT_SHARE_RETAINER: "Profit-Share",
    HYBRID_RETAINER: "Hybrid",
    ADVISORY_HOURLY: "Advisory"
  };
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Project pricing</p>
          <h2 className="mt-2 text-3xl font-semibold">Pricing Projects</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create and reopen Client-linked project estimates.
          </p>
        </div>
        {action}
      </div>

      {projects.length ? (
        <div className="mt-8 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Estimate</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr className="border-t hover:bg-muted/30" key={project.id}>
                  <td className="px-4 py-4 font-mono text-xs">{project.estimateNumber}</td>
                  <td className="px-4 py-4">
                    <Link
                      className="font-medium hover:underline"
                      href={`/pricing-projects/${project.id}`}
                    >
                      {project.projectName}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <p>{project.clientName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{project.clientNumber}</p>
                  </td>
                  <td className="px-4 py-4">{modelLabels[project.pricingModel]}</td>
                  <td className="px-4 py-4">
                    <PricingStatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-4">{project.updatedAt.toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={
                        project.status === "DRAFT"
                          ? `/pricing-projects/${project.id}/edit`
                          : `/pricing-projects/${project.id}`
                      }
                    >
                      {project.status === "DRAFT" ? "Reopen Draft" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
          <h3 className="text-lg font-semibold">No Pricing Projects yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Create a Client-linked Pricing Project to build your first estimate.
          </p>
        </div>
      )}
    </div>
  );
}
