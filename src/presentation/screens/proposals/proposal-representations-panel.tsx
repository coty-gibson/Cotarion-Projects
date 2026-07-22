"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ProposalApiClient,
  type ProposalDetailDto,
  type ProposalRepresentationDto,
  WorkspaceApiError
} from "@/presentation/api/proposal-api-client";

export function ProposalRepresentationsPanel({
  companyId,
  proposal
}: {
  companyId: string;
  proposal: ProposalDetailDto;
}) {
  const api = useMemo(() => new ProposalApiClient(companyId), [companyId]);
  const [items, setItems] = useState<ProposalRepresentationDto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    type: "HTML" | "PDF";
    url?: string;
    html?: string;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      setItems(await api.representationHistory(proposal.id));
    } catch (caught) {
      setError(
        caught instanceof WorkspaceApiError
          ? caught.message
          : "Representation history could not be loaded."
      );
    }
  }, [api, proposal.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview]
  );

  async function generate(versionId: string, type: "HTML" | "PDF") {
    const key = `${versionId}:${type}`;
    setBusy(key);
    setError(null);
    try {
      await api.generateRepresentation(proposal.id, versionId, type);
      await load();
    } catch (caught) {
      setError(
        caught instanceof WorkspaceApiError ? caught.message : "Representation generation failed."
      );
    } finally {
      setBusy(null);
    }
  }
  async function open(item: ProposalRepresentationDto) {
    const blob = await api.representationContent(proposal.id, item.id);
    if (preview?.url) URL.revokeObjectURL(preview.url);
    if (item.representationType === "HTML") setPreview({ type: "HTML", html: await blob.text() });
    else setPreview({ type: "PDF", url: URL.createObjectURL(blob) });
  }
  async function download(item: ProposalRepresentationDto) {
    const blob = await api.representationContent(proposal.id, item.id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${proposal.proposalNumber}-v${item.proposalVersionNumber}.${item.representationType.toLowerCase()}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="proposal-representations-title" className="proposal-panel">
      <h2 id="proposal-representations-title">Representations</h2>
      <p>Immutable customer-facing artifacts generated only from saved Proposal Versions.</p>
      {error ? (
        <p className="proposal-command-error" role="alert">
          {error}
        </p>
      ) : null}
      {proposal.permittedActions.generateRepresentation
        ? proposal.versions.map((version) => (
            <div className="proposal-panel-action" key={version.id}>
              <strong>Version {version.number}</strong>
              {(["HTML", "PDF"] as const).map((type) => (
                <button
                  className="workspace-button workspace-button-secondary"
                  disabled={busy !== null}
                  key={type}
                  onClick={() => void generate(version.id, type)}
                  type="button"
                >
                  {busy === `${version.id}:${type}` ? "Generating…" : `Generate ${type}`}
                </button>
              ))}
            </div>
          ))
        : null}
      <h3>Representation history</h3>
      {!items.length ? (
        <p>No representations generated.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              Version {item.proposalVersionNumber} · {item.representationType} · generated{" "}
              {new Date(item.generatedAt).toLocaleString()}{" "}
              <button className="table-primary-link" onClick={() => void open(item)} type="button">
                Preview
              </button>{" "}
              <button
                className="table-primary-link"
                onClick={() => void download(item)}
                type="button"
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview?.type === "HTML" ? (
        <iframe sandbox="" srcDoc={preview.html} title="Proposal HTML representation preview" />
      ) : null}
      {preview?.type === "PDF" && preview.url ? (
        <iframe src={preview.url} title="Proposal PDF representation preview" />
      ) : null}
    </section>
  );
}
