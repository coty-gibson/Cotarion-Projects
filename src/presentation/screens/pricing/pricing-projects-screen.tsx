"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PricingApiClient, type PricingListQuery, type PricingModel, type PricingStatus } from "@/presentation/api/pricing-api-client";
import { mapPricingListRow, pricingErrorMessage, pricingModelLabel } from "@/presentation/pricing/pricing-view-models";
import { DataTable, EmptyState, ErrorState, FormField, LoadingState, PageHeader, Pagination, SelectInput, StatusBadge, TextInput } from "@/presentation/components/ui/workspace-primitives";

const statuses: Array<"ALL" | PricingStatus> = ["ALL", "DRAFT", "IN_REVIEW", "QUOTED", "ARCHIVED"];
const models: Array<"ALL" | PricingModel> = ["ALL", "PROJECT", "FIXED_RETAINER", "PROFIT_SHARE_RETAINER", "HYBRID_RETAINER", "ADVISORY_HOURLY"];
const sorts: Array<{ value: NonNullable<PricingListQuery["sortBy"]>; label: string }> = [{ value: "lastUpdated", label: "Last updated" }, { value: "estimateNumber", label: "Estimate number" }, { value: "projectName", label: "Project name" }, { value: "status", label: "Status" }, { value: "pricingModel", label: "Pricing model" }];

export function PricingProjectsScreen({ companyId }: { companyId: string }) {
  const router = useRouter(); const parameters = useSearchParams();
  const api = useMemo(() => new PricingApiClient(companyId), [companyId]);
  const [search, setSearch] = useState(parameters.get("search") ?? "");
  const [status, setStatus] = useState(parameters.get("status") ?? "ALL");
  const [model, setModel] = useState(parameters.get("pricingModel") ?? "ALL");
  const [sortBy, setSortBy] = useState(parameters.get("sortBy") ?? "lastUpdated");
  const [sortDirection, setSortDirection] = useState(parameters.get("sortDirection") ?? "desc");
  const [page, setPage] = useState(Number(parameters.get("page") ?? "1"));
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.list>> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setResult(await api.list({ page, pageSize: 20, search: search.trim() || undefined, status: status === "ALL" ? undefined : status as PricingStatus, pricingModel: model === "ALL" ? undefined : model as PricingModel, sortBy: sortBy as NonNullable<PricingListQuery["sortBy"]>, sortDirection: sortDirection as "asc" | "desc" })); }
    catch (caught) { setError(pricingErrorMessage(caught)); }
    finally { setLoading(false); }
  }, [api, model, page, search, sortBy, sortDirection, status]);
  useEffect(() => { void load(); }, [load]);

  function apply(event: React.FormEvent) {
    event.preventDefault(); const next = new URLSearchParams();
    if (search.trim()) next.set("search", search.trim()); if (status !== "ALL") next.set("status", status); if (model !== "ALL") next.set("pricingModel", model);
    next.set("sortBy", sortBy); next.set("sortDirection", sortDirection); next.set("page", "1"); setPage(1); router.replace(`/pricing-projects?${next}`);
  }
  function move(nextPage: number) { setPage(nextPage); const next = new URLSearchParams(parameters.toString()); next.set("page", String(nextPage)); router.replace(`/pricing-projects?${next}`); }

  return <div className="workspace-page">
    <PageHeader eyebrow="Project Pricing" title="Pricing Projects" description="Search, govern, and review Company Pricing Projects." actions={<Link className="workspace-button" href="/pricing-projects/new">New Pricing Project</Link>} />
    <form className="pricing-filter-bar" onSubmit={apply}>
      <FormField label="Search"><TextInput aria-label="Search Pricing Projects" onChange={(event) => setSearch(event.target.value)} placeholder="Estimate, project, or Client" value={search} /></FormField>
      <FormField label="Status"><SelectInput aria-label="Filter by status" onChange={(event) => setStatus(event.target.value)} value={status}>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</SelectInput></FormField>
      <FormField label="Pricing model"><SelectInput aria-label="Filter by Pricing model" onChange={(event) => setModel(event.target.value)} value={model}>{models.map((value) => <option key={value} value={value}>{value === "ALL" ? "All models" : pricingModelLabel(value)}</option>)}</SelectInput></FormField>
      <FormField label="Sort"><SelectInput aria-label="Sort Pricing Projects" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>{sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SelectInput></FormField>
      <FormField label="Direction"><SelectInput aria-label="Sort direction" onChange={(event) => setSortDirection(event.target.value)} value={sortDirection}><option value="desc">Descending</option><option value="asc">Ascending</option></SelectInput></FormField>
      <button className="workspace-button" type="submit">Apply</button>
    </form>
    {loading ? <LoadingState label="Loading Pricing Projects" /> : error ? <ErrorState message={error} retry={() => void load()} /> : !result?.items.length ? <EmptyState title="No Pricing Projects found" description="No Pricing Projects match the current filters. Adjust the filters or create a new Project." /> : <>
      <DataTable caption="Pricing Projects" columns={["Estimate", "Project", "Client", "Owner", "Status", "Model", "Version", "Updated"]}>{result.items.map((item) => { const row = mapPricingListRow(item); return <tr key={row.id}><td><Link className="table-primary-link" href={`/pricing-projects/${row.id}`}>{row.estimateNumber}</Link></td><td>{row.projectName}</td><td>{row.clientLabel}</td><td>{row.ownerLabel}</td><td><StatusBadge status={row.status} /></td><td>{row.pricingModelLabel}</td><td>{row.currentVersionLabel}</td><td><time dateTime={row.lastUpdated}>{row.lastUpdatedLabel}</time></td></tr>; })}</DataTable>
      <p className="pricing-result-count">{result.total.toLocaleString()} result{result.total === 1 ? "" : "s"} · Page {result.page} of {Math.max(1, result.totalPages)}</p>
      <Pagination hasPrevious={result.page > 1} hasNext={result.page < result.totalPages} onPrevious={() => move(result.page - 1)} onNext={() => move(result.page + 1)} />
    </>}
  </div>;
}
