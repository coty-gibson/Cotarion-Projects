import Link from "next/link";
import type { PricingProjectDetail } from "@/application/pricing/pricing-workspace";
import { PricingStatusBadge } from "@/presentation/components/pricing/pricing-status-badge";
import { Button } from "@/presentation/components/ui/button";

function formatUsd(value: string) {
  const [whole, cents = "00"] = value.split(".");
  return `$${BigInt(whole).toLocaleString("en-US")}.${cents.padEnd(2, "0").slice(0, 2)}`;
}

export function PricingProjectDetailScreen({
  project,
  client,
  calculation,
  notice
}: PricingProjectDetail & { notice?: string }) {
  const projectCalculation = "finalProjectPrice" in calculation ? calculation : null;
  const advisoryCalculation = "finalAdvisoryFee" in calculation ? calculation : null;
  const retainerCalculation = "estimatedMonthlyValue" in calculation ? calculation : null;
  const modelLabels = {
    PROJECT: "Project Pricing",
    FIXED_RETAINER: "Fixed Retainer",
    PROFIT_SHARE_RETAINER: "Profit-Share Retainer",
    HYBRID_RETAINER: "Hybrid Retainer",
    ADVISORY_HOURLY: "Advisory Consulting"
  };
  return (
    <div className="mx-auto max-w-6xl">
      {notice ? (
        <div className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm text-muted-foreground">{project.estimateNumber}</p>
            <PricingStatusBadge status={project.status} />
            <span className="rounded-full border px-2.5 py-1 text-xs">
              {modelLabels[project.pricingModel]}
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-semibold">{project.projectName}</h2>
          <Link
            className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
            href={`/clients/${client.id}`}
          >
            {client.name} · {client.clientNumber}
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/pricing-projects">All Pricing Projects</Link>
          </Button>
          {project.status === "DRAFT" ? (
            <Button asChild>
              <Link href={`/pricing-projects/${project.id}/edit`}>Reopen Draft</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {projectCalculation ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-lg border">
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold">Services</h3>
            </div>
            <div className="divide-y">
              {projectCalculation.serviceLines.map((line) => (
                <div
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_100px_120px] sm:items-center"
                  key={line.lineId}
                >
                  <div>
                    <p className="font-medium">{line.serviceName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatUsd(line.unitPrice.toString())} each
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">Qty {line.quantity}</p>
                  <p className="font-medium sm:text-right">
                    {formatUsd(line.lineTotal.toString())}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <PricingSummary
            finalLabel="Final project price"
            finalValue={projectCalculation.finalProjectPrice.toString()}
            rows={[
              ["Services subtotal", projectCalculation.projectSubtotal.toString()],
              [
                `Complexity (${projectCalculation.complexityMultiplier.toString()}x)`,
                projectCalculation.complexityAdjustment.toString()
              ],
              ["Adjusted subtotal", projectCalculation.adjustedSubtotal.toString()],
              ["Discount", `-${projectCalculation.discountAmount.toString()}`]
            ]}
            methodologyVersion={project.methodologyVersion}
            version={projectCalculation.pricingConfigurationVersion}
          />
        </div>
      ) : null}

      {retainerCalculation ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-lg border p-5">
            <h3 className="text-lg font-semibold">Retainer methodology</h3>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <SummaryRow
                label="Base monthly fee"
                value={formatUsd(retainerCalculation.baseMonthlyFee.toString())}
              />
              <SummaryRow
                label={`Complexity (${retainerCalculation.complexityMultiplier.toString()}x)`}
                value={formatUsd(retainerCalculation.complexityAdjustedMonthlyBase.toString())}
              />
              <SummaryRow
                label="Fixed monthly payment"
                value={formatUsd(retainerCalculation.fixedMonthlyPayment.toString())}
              />
              <SummaryRow
                label="Profit-share rate"
                value={`${Number(retainerCalculation.profitShareRate.toString()) * 100}%`}
              />
              {retainerCalculation.averageAdjustedOperatingProfit ? (
                <SummaryRow
                  label="Three-month average AOP"
                  value={formatUsd(retainerCalculation.averageAdjustedOperatingProfit.toString())}
                />
              ) : null}
            </dl>
            {retainerCalculation.aopMonths.length ? (
              <div className="mt-6 border-t pt-5">
                <h4 className="font-medium">Adjusted Operating Profit inputs</h4>
                <div className="mt-3 space-y-3">
                  {retainerCalculation.aopMonths.map((month) => (
                    <div className="rounded-md bg-muted/40 p-3 text-sm" key={month.month}>
                      <div className="flex justify-between gap-4">
                        <span>{month.month}</span>
                        <span className="font-medium">{month.adjustedOperatingProfit}</span>
                      </div>
                      {month.adjustmentNotes ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {month.adjustmentNotes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          <PricingSummary
            finalLabel="Estimated monthly value"
            finalValue={retainerCalculation.estimatedMonthlyValue.toString()}
            rows={
              retainerCalculation.pricingModel === "FIXED_RETAINER"
                ? [
                    ["Base monthly fee", retainerCalculation.baseMonthlyFee.toString()],
                    [
                      `Complexity-adjusted base (${retainerCalculation.complexityMultiplier.toString()}x)`,
                      retainerCalculation.complexityAdjustedMonthlyBase.toString()
                    ],
                    [
                      "Term discount",
                      `${Number(retainerCalculation.termDiscountRate.toString()) * 100}%`
                    ],
                    [
                      "Standard discount",
                      `${Number(retainerCalculation.standardDiscountRate.toString()) * 100}%`
                    ],
                    ["Discount amount", `-${retainerCalculation.discountAmount.toString()}`]
                  ]
                : [
                    ["Base monthly fee", retainerCalculation.baseMonthlyFee.toString()],
                    [
                      `Complexity-adjusted base (${retainerCalculation.complexityMultiplier.toString()}x)`,
                      retainerCalculation.complexityAdjustedMonthlyBase.toString()
                    ],
                    ["Fixed payment", retainerCalculation.fixedMonthlyPayment.toString()],
                    ["Profit-share target", retainerCalculation.profitShareTarget.toString()],
                    [
                      "Profit-share rate",
                      `${Number(retainerCalculation.profitShareRate.toString()) * 100}%`
                    ],
                    [
                      "Estimated profit-share",
                      retainerCalculation.estimatedProfitSharePayment.toString()
                    ]
                  ]
            }
            methodologyVersion={project.methodologyVersion}
            version={retainerCalculation.pricingConfigurationVersion}
          />
        </div>
      ) : null}

      {advisoryCalculation ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-lg border p-5">
            <h3 className="text-lg font-semibold">Advisory Consulting</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Advice-only consulting billed at $250 per hour in 30-minute increments. Implementation
              and deliverable production are priced separately.
            </p>
          </section>
          <PricingSummary
            finalLabel="Advisory fee"
            finalValue={advisoryCalculation.finalAdvisoryFee.toString()}
            rows={[
              ["Duration", `${advisoryCalculation.durationMinutes} minutes`],
              ["Billing increments", String(advisoryCalculation.billingIncrements)],
              ["Hourly rate", advisoryCalculation.hourlyRate.toString()]
            ]}
            methodologyVersion={project.methodologyVersion}
            version={advisoryCalculation.pricingConfigurationVersion}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-5">
          <h3 className="font-semibold">Complexity</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {project.complexitySelections.length} factors selected
            {"complexityMultiplier" in calculation
              ? ` · Combined multiplier ${calculation.complexityMultiplier.toString()}x`
              : ""}
          </p>
        </section>
        <section className="rounded-lg border p-5">
          <h3 className="font-semibold">Project record</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{project.createdAt.toLocaleDateString()}</dd>
            <dt className="text-muted-foreground">Last updated</dt>
            <dd>{project.updatedAt.toLocaleDateString()}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}

function PricingSummary({
  finalLabel,
  finalValue,
  rows,
  methodologyVersion,
  version
}: {
  finalLabel: string;
  finalValue: string;
  rows: [string, string][];
  methodologyVersion: string;
  version: number;
}) {
  const display = (value: string) => {
    if (/^-?\d+\.\d{2}$/.test(value)) {
      return value.startsWith("-") ? `−${formatUsd(value.slice(1))}` : formatUsd(value);
    }
    return value;
  };
  return (
    <aside className="rounded-lg border p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pricing Summary
      </p>
      <dl className="mt-5 space-y-4 text-sm">
        {rows.map(([label, value]) => (
          <SummaryRow key={label} label={label} value={display(value)} />
        ))}
      </dl>
      <div className="mt-5 border-t pt-5">
        <p className="text-sm text-muted-foreground">{finalLabel}</p>
        <p className="mt-1 text-3xl font-semibold">{formatUsd(finalValue)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          USD · Configuration v{version} · Methodology {methodologyVersion}
        </p>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
