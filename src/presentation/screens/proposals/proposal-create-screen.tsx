"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProposalApiClient, WorkspaceApiError } from "@/presentation/api/proposal-api-client";
import { ErrorState, FormField, PageHeader, SelectInput, TextInput } from "@/presentation/components/ui/workspace-primitives";

export function ProposalCreateScreen({ companyId }: { companyId: string }) {
  const api = useMemo(() => new ProposalApiClient(companyId), [companyId]);
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [pricingProjectId, setPricingProjectId] = useState("");
  const [pricingVersionId, setPricingVersionId] = useState("");
  const [title, setTitle] = useState("");
  const [engagementTypeCode, setEngagementTypeCode] = useState<"PROJECT" | "ADVISORY" | "RETAINER" | "DIAGNOSTIC" | "STRATEGY_SESSION">("PROJECT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.create({ clientId, pricingProjectId, pricingVersionId, title, engagementTypeCode });
      router.push(`/proposals/${result.proposal.id}`);
    } catch (caught) {
      setError(caught instanceof WorkspaceApiError ? caught.message : "The Proposal could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="workspace-page">
    <PageHeader eyebrow="Proposal Management" title="Create Proposal" description="Select an immutable approved Pricing Version and establish a Draft Proposal." />
    {error ? <ErrorState message={error} retry={() => setError(null)} /> : null}
    <form className="proposal-command-dialog" onSubmit={submit}>
      <FormField label="Title"><TextInput required value={title} onChange={(event) => setTitle(event.target.value)} /></FormField>
      <FormField label="Client ID"><TextInput required value={clientId} onChange={(event) => setClientId(event.target.value)} /></FormField>
      <FormField label="Pricing Project ID"><TextInput required value={pricingProjectId} onChange={(event) => setPricingProjectId(event.target.value)} /></FormField>
      <FormField label="Pricing Version ID"><TextInput required value={pricingVersionId} onChange={(event) => setPricingVersionId(event.target.value)} /></FormField>
      <FormField label="Engagement Type"><SelectInput value={engagementTypeCode} onChange={(event) => setEngagementTypeCode(event.target.value as typeof engagementTypeCode)}>
        <option value="PROJECT">Project</option><option value="ADVISORY">Advisory</option><option value="RETAINER">Retainer</option><option value="DIAGNOSTIC">Diagnostic</option><option value="STRATEGY_SESSION">Strategy Session</option>
      </SelectInput></FormField>
      <button className="workspace-button" disabled={submitting} type="submit">{submitting ? "Creating…" : "Create Proposal"}</button>
    </form>
  </div>;
}
