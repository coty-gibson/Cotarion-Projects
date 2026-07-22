"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ProposalApiClient, WorkspaceApiError, type AgreementDto, type AgreementExecutionDto, type SignatureRequestDto } from "@/presentation/api/proposal-api-client";

export function ProposalAgreementsPanel({ companyId, proposalId }: { companyId: string; proposalId: string }) {
  const api = useMemo(() => new ProposalApiClient(companyId), [companyId]);
  const [items, setItems] = useState<AgreementDto[]>([]);
  const [signatures, setSignatures] = useState<SignatureRequestDto[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [canCreateSignatures, setCanCreateSignatures] = useState(false);
  const [execution, setExecution] = useState<AgreementExecutionDto | null>(null);
  const [canExecute, setCanExecute] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState(""); const [clientEmail, setClientEmail] = useState("");
  const [repName, setRepName] = useState(""); const [repEmail, setRepEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [mode, setMode] = useState<"PARALLEL" | "ORDERED">("PARALLEL");

  const load = useCallback(async () => {
    try {
      const result = await api.agreements(proposalId);
      setItems(result.items); setCanGenerate(result.permittedActions.generate);
      if (result.items[0]) { const [projected, executionProjection] = await Promise.all([api.signatureRequests(result.items[0].id), api.execution(result.items[0].id)]); setSignatures(projected.items); setCanCreateSignatures(projected.permittedActions.create); setExecution(executionProjection.execution); setCanExecute(executionProjection.permittedActions.execute); }
      else { setSignatures([]); setCanCreateSignatures(false); setExecution(null); setCanExecute(false); }
    } catch (caught) { setError(caught instanceof WorkspaceApiError ? caught.message : "Agreement information could not be loaded."); }
  }, [api, proposalId]);
  useEffect(() => { void load(); }, [load]);

  async function generate() { setBusy(true); try { await api.generateAgreement(proposalId); await load(); } catch (caught) { setError(caught instanceof WorkspaceApiError ? caught.message : "Agreement could not be generated."); } finally { setBusy(false); } }
  async function createSignatures(event: React.FormEvent) {
    event.preventDefault(); if (!items[0]) return; setBusy(true);
    try {
      const result = await api.createSignatureRequests(items[0].id, { signingMode: mode, expiresAt: new Date(expiresAt).toISOString(), signers: [{ displayName: clientName, email: clientEmail, role: "CLIENT", order: 1 }, { displayName: repName, email: repEmail, role: "COTARION_REPRESENTATIVE", order: 2 }] });
      setSignatures(result.items); setCanCreateSignatures(false);
    } catch (caught) { setError(caught instanceof WorkspaceApiError ? caught.message : "Signature Requests could not be created."); } finally { setBusy(false); }
  }
  async function executeAgreement() { if (!items[0]) return; setBusy(true); try { const result = await api.executeAgreement(items[0].id); setExecution(result.execution); setCanExecute(false); } catch (caught) { setError(caught instanceof WorkspaceApiError ? caught.message : "Agreement could not be executed."); } finally { setBusy(false); } }

  return <section className="proposal-panel"><h2>Agreements and Signatures</h2>{error ? <p role="alert">{error}</p> : null}{canGenerate ? <button disabled={busy} onClick={() => void generate()}>Generate Agreement</button> : null}
    {items.map(item => <div key={item.id}><h3>{item.agreementNumber} · Version {item.agreementVersion} · {item.status}</h3><button onClick={() => void api.agreementArtifact(proposalId, item.id, "HTML").then(blob => window.open(URL.createObjectURL(blob), "_blank"))}>Open HTML</button><button onClick={() => void api.agreementArtifact(proposalId, item.id, "PDF").then(blob => window.open(URL.createObjectURL(blob), "_blank"))}>Download PDF</button></div>)}
    {canCreateSignatures ? <form onSubmit={createSignatures}><h3>Create Signature Requests</h3><select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="PARALLEL">Parallel</option><option value="ORDERED">Ordered</option></select><input required placeholder="Client signer name" value={clientName} onChange={event => setClientName(event.target.value)} /><input required type="email" placeholder="Client email" value={clientEmail} onChange={event => setClientEmail(event.target.value)} /><input required placeholder="Cotarion representative" value={repName} onChange={event => setRepName(event.target.value)} /><input required type="email" placeholder="Representative email" value={repEmail} onChange={event => setRepEmail(event.target.value)} /><input required type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /><button disabled={busy}>Create requests</button></form> : null}
    <h3>Signing progress</h3>{signatures.length ? <ul>{signatures.map(signature => <li key={signature.id}>{signature.signer.role} · Order {signature.signer.order} · {signature.status}{signature.secureUrl ? <button onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${signature.secureUrl}`)}>Copy link</button> : null}{signature.permittedActions.revoke ? <button onClick={() => void api.revokeSignatureRequest(signature.agreementId, signature.id).then(load)}>Revoke</button> : null}</li>)}</ul> : <p>No Signature Requests.</p>}
    <h3>Execution</h3>{execution ? <div><p>Executed {new Date(execution.executedAt).toLocaleString()} by {execution.executedBy}</p><ul>{execution.signerSummary.map(signer => <li key={signer.signatureEvidenceReference}>{signer.role} · {signer.displayName} · signed {new Date(signer.signedAt).toLocaleString()}</li>)}</ul></div> : <p>Not executed.</p>}{canExecute ? <button disabled={busy} onClick={() => void executeAgreement()}>Execute Agreement</button> : null}
  </section>;
}
