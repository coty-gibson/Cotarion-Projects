"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProposalApiClient, type ProposalSummaryDto, WorkspaceApiError } from "@/presentation/api/proposal-api-client";
import { DataTable, EmptyState, ErrorState, FormField, LoadingState, PageHeader, Pagination, SelectInput, StatusBadge, TextInput } from "@/presentation/components/ui/workspace-primitives";

const statusOptions = ["ALL", "DRAFT", "INTERNAL_REVIEW", "EXECUTIVE_AUTHORIZATION", "APPROVED", "REJECTED", "SUBMITTED", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED", "ARCHIVED"];

export function ProposalListTable({ items, nextCursor, hasPrevious, onNext, onPrevious }: { items: ProposalSummaryDto[]; nextCursor: string | null; hasPrevious: boolean; onNext: () => void; onPrevious: () => void }) {
  if (!items.length) return <EmptyState title="No Proposals found" description="No Proposal records match the current Company filters." />;
  return <><DataTable caption="Company Proposals" columns={["Proposal", "Client", "Owner", "Status", "Updated", "Versions"]}>
    {items.map((proposal) => <tr key={proposal.id}><td><Link className="table-primary-link" href={`/proposals/${proposal.id}`}>{proposal.proposalNumber}</Link><span>{proposal.title}</span></td><td>{proposal.clientId}</td><td>{proposal.ownerId}</td><td><StatusBadge status={proposal.status} /></td><td><time dateTime={proposal.updatedAt}>{new Date(proposal.updatedAt).toLocaleDateString()}</time></td><td>{proposal.versionCount}</td></tr>)}
  </DataTable><Pagination hasNext={Boolean(nextCursor)} hasPrevious={hasPrevious} onNext={onNext} onPrevious={onPrevious} /></>;
}

export function ProposalListScreen({ companyId }: { companyId: string }) {
  const api = useMemo(() => new ProposalApiClient(companyId), [companyId]);
  const [items, setItems] = useState<ProposalSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("ALL");
  const [ownerId, setOwnerId] = useState("");
  const [clientId, setClientId] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | undefined)[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const page = await api.list({ limit: 20, cursor, status: status === "ALL" ? undefined : status, ownerId: ownerId.trim() || undefined, clientId: clientId.trim() || undefined });
      setItems(page.items); setNextCursor(page.nextCursor);
    } catch (caught) {
      setError(caught instanceof WorkspaceApiError ? caught.message : "Proposals could not be loaded.");
    } finally { setLoading(false); }
  }, [api, clientId, cursor, ownerId, status]);

  useEffect(() => { void load(); }, [load]);
  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setHistory([]);
    if (cursor === undefined) void load();
    else setCursor(undefined);
  }
  function next() { if (!nextCursor) return; setHistory((current) => [...current, cursor]); setCursor(nextCursor); }
  function previous() { const prior = history.at(-1); setHistory((current) => current.slice(0, -1)); setCursor(prior); }

  return <div className="workspace-page">
    <PageHeader eyebrow="Proposal Management" title="Proposals" description="Review current offers, immutable versions, and lifecycle state." />
    <div className="workspace-page-actions"><Link className="workspace-button" href="/proposals/new">Create Proposal</Link></div>
    <form className="workspace-filter-bar" onSubmit={applyFilters}>
      <FormField label="Status"><SelectInput aria-label="Filter by status" onChange={(event) => setStatus(event.target.value)} value={status}>{statusOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectInput></FormField>
      <FormField label="Client ID"><TextInput onChange={(event) => setClientId(event.target.value)} placeholder="Client identifier" value={clientId} /></FormField>
      <FormField label="Owner ID"><TextInput onChange={(event) => setOwnerId(event.target.value)} placeholder="Owner identifier" value={ownerId} /></FormField>
      <button className="workspace-button" type="submit">Apply filters</button>
    </form>
    {loading ? <LoadingState label="Loading Proposals" /> : error ? <ErrorState message={error} retry={() => void load()} /> : <ProposalListTable hasPrevious={history.length > 0} items={items} nextCursor={nextCursor} onNext={next} onPrevious={previous} />}
  </div>;
}
