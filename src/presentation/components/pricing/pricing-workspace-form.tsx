"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import type {
  PricingDraftInput,
  PricingWorkspaceOptions
} from "@/application/pricing/pricing-workspace";
import { calculatePricingDraft } from "@/application/pricing/pricing-workspace";
import type { PricingWorkspaceFormState } from "@/app/(protected)/pricing-projects/actions";
import { Button } from "@/presentation/components/ui/button";

const fieldClass =
  "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary";

function formatUsd(value: string) {
  const [whole, cents = "00"] = value.split(".");
  return `$${BigInt(whole).toLocaleString("en-US")}.${cents.padEnd(2, "0").slice(0, 2)}`;
}

function newLineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}`;
}

function defaultDraft(options: PricingWorkspaceOptions, clientId?: string): PricingDraftInput {
  const now = new Date();
  const aopMonths = [3, 2, 1].map((monthsAgo) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      adjustedOperatingProfit: "",
      adjustmentNotes: ""
    };
  });
  return {
    projectName: "",
    clientId: clientId ?? options.clients[0]?.id ?? "",
    pricingModel: "PROJECT",
    lines: [
      {
        lineId: "line-1",
        serviceCatalogItemId: options.services[0]?.catalogItemId ?? "",
        quantity: "1.00"
      }
    ],
    complexitySelections: options.configuration.complexityFactors.map((factor) => ({
      factorId: factor.id,
      optionId: factor.options.find(({ standard }) => standard)?.id ?? factor.options[0]?.id ?? ""
    })),
    discountId: options.configuration.discounts[0]?.id ?? "none",
    retainerLevelId: options.configuration.retainerLevels?.[0]?.id ?? "advisory",
    retainerTermId: options.configuration.retainerTerms?.[0]?.id ?? "3-month",
    fixedMonthlyPayment: "0.00",
    aopMonths,
    advisoryDurationMinutes: "30"
  };
}

export function PricingWorkspaceForm({
  action,
  options,
  initialClientId,
  initialDraft,
  lockClient = false,
  pricingProjectId
}: {
  action: (
    state: PricingWorkspaceFormState,
    formData: FormData
  ) => Promise<PricingWorkspaceFormState>;
  options: PricingWorkspaceOptions;
  initialClientId?: string;
  initialDraft?: PricingDraftInput;
  lockClient?: boolean;
  pricingProjectId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { messages: [] });
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<PricingDraftInput>(
    initialDraft ?? defaultDraft(options, initialClientId)
  );
  useEffect(() => setReady(true), []);
  const evaluation = useMemo(() => calculatePricingDraft(draft, options), [draft, options]);
  const calculation = evaluation.calculation;
  const projectCalculation = calculation && "finalProjectPrice" in calculation ? calculation : null;
  const advisoryCalculation = calculation && "finalAdvisoryFee" in calculation ? calculation : null;
  const retainerCalculation =
    calculation && "estimatedMonthlyValue" in calculation ? calculation : null;
  const cancelHref = pricingProjectId
    ? `/pricing-projects/${pricingProjectId}`
    : "/pricing-projects";

  function updateLine(lineId: string, update: Partial<PricingDraftInput["lines"][number]>) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.lineId === lineId ? { ...line, ...update } : line))
    }));
  }

  if (options.clients.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
        <h3 className="text-lg font-semibold">Create a Client first</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Every Pricing Project must belong to an existing Client.
        </p>
        <Button asChild className="mt-5">
          <Link href="/clients/new">Create Client</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      {ready ? (
        <span className="sr-only" data-testid="pricing-workspace-ready">
          Pricing workspace ready
        </span>
      ) : null}
      <div className="flex flex-col gap-6">
        {state.messages.length ? (
          <div
            aria-live="polite"
            className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"
          >
            <p className="font-medium">The Draft could not be saved.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.pricingModel.endsWith("RETAINER") ? (
          <section className="order-4 rounded-lg border bg-background p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                4 · Retainer
              </p>
              <h3 className="mt-1 text-lg font-semibold">Configure recurring support</h3>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-medium">Retainer service level *</span>
                <select
                  className={fieldClass}
                  name="retainerLevelId"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      retainerLevelId: event.target.value
                    }))
                  }
                  value={draft.retainerLevelId}
                >
                  {options.configuration.retainerLevels?.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label} · {formatUsd(level.baseMonthlyFee)}/month
                    </option>
                  ))}
                </select>
              </label>
              {draft.pricingModel === "FIXED_RETAINER" ? (
                <label>
                  <span className="text-sm font-medium">Term *</span>
                  <select
                    className={fieldClass}
                    name="retainerTermId"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        retainerTermId: event.target.value
                      }))
                    }
                    value={draft.retainerTermId}
                  >
                    {options.configuration.retainerTerms?.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                        {term.discountRate === "0"
                          ? ""
                          : ` · ${DecimalPercent(term.discountRate)} term discount`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {draft.pricingModel === "HYBRID_RETAINER" ? (
                <label>
                  <span className="text-sm font-medium">Fixed monthly payment *</span>
                  <input
                    className={fieldClass}
                    min="0"
                    name="fixedMonthlyPayment"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        fixedMonthlyPayment: event.target.value
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={draft.fixedMonthlyPayment}
                  />
                </label>
              ) : null}
            </div>

            {draft.pricingModel !== "FIXED_RETAINER" ? (
              <div className="mt-6">
                <h4 className="font-medium">Three completed months of Adjusted Operating Profit</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Include zero and negative months. Document any adjustments used.
                </p>
                <div className="mt-4 space-y-3">
                  {draft.aopMonths.map((month, index) => (
                    <div
                      className="grid gap-3 rounded-md border p-4 md:grid-cols-[150px_180px_minmax(0,1fr)]"
                      key={index}
                    >
                      <label>
                        <span className="text-sm font-medium">Month {index + 1}</span>
                        <input
                          className={fieldClass}
                          name="aopMonth"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              aopMonths: current.aopMonths.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, month: event.target.value }
                                  : entry
                              )
                            }))
                          }
                          type="month"
                          value={month.month}
                        />
                      </label>
                      <label>
                        <span className="text-sm font-medium">Adjusted Operating Profit *</span>
                        <input
                          className={fieldClass}
                          name="aopAmount"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              aopMonths: current.aopMonths.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? {
                                      ...entry,
                                      adjustedOperatingProfit: event.target.value
                                    }
                                  : entry
                              )
                            }))
                          }
                          placeholder="10000.00"
                          step="0.01"
                          type="number"
                          value={month.adjustedOperatingProfit}
                        />
                      </label>
                      <label>
                        <span className="text-sm font-medium">Adjustment notes</span>
                        <input
                          className={fieldClass}
                          name="aopNotes"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              aopMonths: current.aopMonths.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, adjustmentNotes: event.target.value }
                                  : entry
                              )
                            }))
                          }
                          placeholder="Extraordinary items removed"
                          value={month.adjustmentNotes}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {draft.pricingModel === "ADVISORY_HOURLY" ? (
          <section className="order-2 rounded-lg border bg-background p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              2 · Advisory Consulting
            </p>
            <h3 className="mt-1 text-lg font-semibold">Configure advice-only consulting</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              $250 per hour, billed in 30-minute increments. Implementation and deliverables are
              priced separately.
            </p>
            <label className="mt-5 block max-w-xs">
              <span className="text-sm font-medium">Duration *</span>
              <select
                className={fieldClass}
                name="advisoryDurationMinutes"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    advisoryDurationMinutes: event.target.value
                  }))
                }
                value={draft.advisoryDurationMinutes}
              >
                {[30, 60, 90, 120, 150, 180, 240].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        <section className="order-1 rounded-lg border bg-background p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              1 · Project
            </p>
            <h3 className="mt-1 text-lg font-semibold">Project basics</h3>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium">Client *</span>
              {lockClient ? (
                <>
                  <input name="clientId" type="hidden" value={draft.clientId} />
                  <div className={`${fieldClass} flex items-center bg-muted/40`}>
                    {options.clients.find(({ id }) => id === draft.clientId)?.name}
                  </div>
                </>
              ) : (
                <select
                  className={fieldClass}
                  name="clientId"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, clientId: event.target.value }))
                  }
                  value={draft.clientId}
                >
                  {options.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} · {client.clientNumber}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label>
              <span className="text-sm font-medium">Pricing model *</span>
              <select
                className={fieldClass}
                name="pricingModel"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    pricingModel: event.target.value as PricingDraftInput["pricingModel"]
                  }))
                }
                value={draft.pricingModel}
              >
                <option value="PROJECT">Project Pricing</option>
                <option value="FIXED_RETAINER">Fixed Retainer</option>
                <option value="PROFIT_SHARE_RETAINER">Profit-Share Retainer</option>
                <option value="HYBRID_RETAINER">Hybrid Retainer</option>
                <option value="ADVISORY_HOURLY">Advisory Consulting (Hourly)</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Project name *</span>
              <input
                className={fieldClass}
                maxLength={200}
                name="projectName"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, projectName: event.target.value }))
                }
                placeholder="Operations optimization"
                value={draft.projectName}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Describe the work—dates and version numbers are added automatically.
              </span>
            </label>
          </div>
        </section>

        {draft.pricingModel === "PROJECT" ? (
          <section className="order-2 rounded-lg border bg-background p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  2 · Services
                </p>
                <h3 className="mt-1 text-lg font-semibold">What work is included?</h3>
              </div>
              <Button
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    lines: [
                      ...current.lines,
                      {
                        lineId: newLineId(),
                        serviceCatalogItemId: options.services[0]?.catalogItemId ?? "",
                        quantity: "1.00"
                      }
                    ]
                  }))
                }
                type="button"
                variant="outline"
              >
                Add service
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {draft.lines.map((line, index) => {
                const pricedLine =
                  calculation && "serviceLines" in calculation
                    ? calculation.serviceLines.find(({ lineId }) => lineId === line.lineId)
                    : undefined;
                return (
                  <div
                    className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_110px_120px_auto] md:items-end"
                    key={line.lineId}
                  >
                    <input name="lineId" type="hidden" value={line.lineId} />
                    <label>
                      <span className="text-sm font-medium">Service {index + 1}</span>
                      <select
                        className={fieldClass}
                        name="lineServiceId"
                        onChange={(event) =>
                          updateLine(line.lineId, {
                            serviceCatalogItemId: event.target.value
                          })
                        }
                        value={line.serviceCatalogItemId}
                      >
                        {options.configuration.categories.map((category) => (
                          <optgroup key={category.id} label={category.name}>
                            {options.services
                              .filter(({ categoryId }) => categoryId === category.id)
                              .map((service) => (
                                <option key={service.catalogItemId} value={service.catalogItemId}>
                                  {service.name} · {formatUsd(service.unitPrice)}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="text-sm font-medium">Quantity</span>
                      <input
                        className={fieldClass}
                        inputMode="decimal"
                        min="0.01"
                        name="lineQuantity"
                        onChange={(event) =>
                          updateLine(line.lineId, { quantity: event.target.value })
                        }
                        step="0.01"
                        type="number"
                        value={line.quantity}
                      />
                    </label>
                    <div>
                      <span className="text-sm font-medium">Line total</span>
                      <p className="mt-2 h-10 py-2 text-sm font-semibold">
                        {pricedLine ? formatUsd(pricedLine.lineTotal.toString()) : "—"}
                      </p>
                    </div>
                    <Button
                      aria-label={`Remove service ${index + 1}`}
                      disabled={draft.lines.length === 1}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          lines: current.lines.filter(({ lineId }) => lineId !== line.lineId)
                        }))
                      }
                      type="button"
                      variant="outline"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {draft.pricingModel !== "ADVISORY_HOURLY" ? (
          <section className="order-3 rounded-lg border bg-background p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                3 · Complexity
              </p>
              <h3 className="mt-1 text-lg font-semibold">Adjust for delivery complexity</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Standard adds no adjustment. Choose one option for each factor.
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {options.configuration.complexityFactors.map((factor) => {
                const selected =
                  draft.complexitySelections.find(({ factorId }) => factorId === factor.id)
                    ?.optionId ?? "";
                return (
                  <label key={factor.id}>
                    <span className="text-sm font-medium">{factor.label}</span>
                    <input name="complexityFactorId" type="hidden" value={factor.id} />
                    <select
                      className={fieldClass}
                      name="complexityOptionId"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          complexitySelections: current.complexitySelections.map((selection) =>
                            selection.factorId === factor.id
                              ? { ...selection, optionId: event.target.value }
                              : selection
                          )
                        }))
                      }
                      value={selected}
                    >
                      {factor.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                          {option.increment === "0" ? "" : ` (+${option.increment})`}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}

        {draft.pricingModel === "PROJECT" || draft.pricingModel === "FIXED_RETAINER" ? (
          <section className="order-5 rounded-lg border bg-background p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                4 · Discount
              </p>
              <h3 className="mt-1 text-lg font-semibold">Apply a standard discount</h3>
            </div>
            <label className="mt-5 block max-w-md">
              <span className="text-sm font-medium">Discount</span>
              <select
                className={fieldClass}
                name="discountId"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, discountId: event.target.value }))
                }
                value={draft.discountId}
              >
                {options.configuration.discounts.map((discount) => (
                  <option key={discount.id} value={discount.id}>
                    {discount.label}
                    {discount.rate === "0" ? "" : ` (${DecimalPercent(discount.rate)})`}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : (
          <input name="discountId" type="hidden" value="none" />
        )}

        <div className="order-6 flex flex-wrap justify-end gap-3 xl:hidden">
          <Button asChild type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button disabled={pending || !evaluation.valid} type="submit">
            {pending ? "Saving…" : "Save Draft"}
          </Button>
        </div>
      </div>

      <aside className="rounded-lg border bg-background p-5 xl:sticky xl:top-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live pricing
        </p>
        <h3 className="mt-1 text-xl font-semibold">Pricing Summary</h3>
        {projectCalculation ? (
          <dl className="mt-6 space-y-4 text-sm">
            <SummaryRow
              label="Services subtotal"
              value={formatUsd(projectCalculation.projectSubtotal.toString())}
            />
            <SummaryRow
              label={`Complexity (${projectCalculation.complexityMultiplier.toString()}x)`}
              value={formatUsd(projectCalculation.complexityAdjustment.toString())}
            />
            <SummaryRow
              label="Adjusted subtotal"
              value={formatUsd(projectCalculation.adjustedSubtotal.toString())}
            />
            <SummaryRow
              label="Discount"
              value={`−${formatUsd(projectCalculation.discountAmount.toString())}`}
            />
          </dl>
        ) : null}
        {retainerCalculation ? (
          <dl className="mt-6 space-y-4 text-sm">
            <SummaryRow
              label="Base monthly fee"
              value={formatUsd(retainerCalculation.baseMonthlyFee.toString())}
            />
            <SummaryRow
              label={`Retainer complexity (${retainerCalculation.complexityMultiplier.toString()}x)`}
              value={formatUsd(retainerCalculation.complexityAdjustedMonthlyBase.toString())}
            />
            {retainerCalculation.pricingModel === "FIXED_RETAINER" ? (
              <>
                <SummaryRow
                  label={`Term discount (${DecimalPercent(retainerCalculation.termDiscountRate.toString())})`}
                  value={DecimalPercent(retainerCalculation.termDiscountRate.toString())}
                />
                <SummaryRow
                  label={`Standard discount (${DecimalPercent(retainerCalculation.standardDiscountRate.toString())})`}
                  value={DecimalPercent(retainerCalculation.standardDiscountRate.toString())}
                />
                <SummaryRow
                  label={`Total discount (${DecimalPercent(retainerCalculation.totalDiscountRate.toString())})`}
                  value={`−${formatUsd(retainerCalculation.discountAmount.toString())}`}
                />
              </>
            ) : (
              <>
                <SummaryRow
                  label="Three-month average AOP"
                  value={
                    retainerCalculation.averageAdjustedOperatingProfit
                      ? formatUsd(retainerCalculation.averageAdjustedOperatingProfit.toString())
                      : "—"
                  }
                />
                <SummaryRow
                  label="Fixed monthly payment"
                  value={formatUsd(retainerCalculation.fixedMonthlyPayment.toString())}
                />
                <SummaryRow
                  label="Profit-share target"
                  value={formatUsd(retainerCalculation.profitShareTarget.toString())}
                />
                <SummaryRow
                  label="Profit-share rate"
                  value={DecimalPercent(retainerCalculation.profitShareRate.toString())}
                />
                <SummaryRow
                  label="Estimated profit-share payment"
                  value={formatUsd(retainerCalculation.estimatedProfitSharePayment.toString())}
                />
              </>
            )}
          </dl>
        ) : null}
        {advisoryCalculation ? (
          <dl className="mt-6 space-y-4 text-sm">
            <SummaryRow label="Hourly rate" value="$250.00" />
            <SummaryRow label="Duration" value={`${advisoryCalculation.durationMinutes} minutes`} />
          </dl>
        ) : null}
        <div className="mt-5 border-t pt-5">
          <p className="text-sm text-muted-foreground">
            {draft.pricingModel === "PROJECT"
              ? "Final project price"
              : draft.pricingModel === "ADVISORY_HOURLY"
                ? "Advisory fee"
                : "Estimated monthly value"}
          </p>
          <p className="mt-1 text-3xl font-semibold">
            {projectCalculation
              ? formatUsd(projectCalculation.finalProjectPrice.toString())
              : advisoryCalculation
                ? formatUsd(advisoryCalculation.finalAdvisoryFee.toString())
                : retainerCalculation
                  ? formatUsd(retainerCalculation.estimatedMonthlyValue.toString())
                  : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            USD · Configuration v{options.configuration.version}
          </p>
        </div>

        {evaluation.warnings.length ? (
          <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {evaluation.warnings.join(" ")}
          </div>
        ) : null}
        {!evaluation.valid && evaluation.messages.length ? (
          <div className="mt-5 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900">
            <p className="font-semibold">Validation errors</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {evaluation.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 hidden gap-3 xl:flex">
          <Button asChild className="flex-1" type="button" variant="outline">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button className="flex-1" disabled={pending || !evaluation.valid} type="submit">
            {pending ? "Saving…" : "Save Draft"}
          </Button>
        </div>
      </aside>
    </form>
  );
}

function DecimalPercent(rate: string) {
  return `${(Number(rate) * 100).toLocaleString("en-US")}%`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
