"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ProposalApiClient,
  type ProposalCommandResponse,
  type ProposalDetailDto,
  type ProposalPermittedActionsDto,
  WorkspaceApiError
} from "@/presentation/api/proposal-api-client";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge
} from "@/presentation/components/ui/workspace-primitives";
import { useToast } from "@/presentation/components/ui/toast";
import { DraftPanel, EvidencePanels, PricingPanel } from "./proposal-workspace-panels";
import { ProposalRepresentationsPanel } from "./proposal-representations-panel";
import { ProposalDeliveriesPanel } from "./proposal-deliveries-panel";
import { ProposalAgreementsPanel } from "./proposal-agreements-panel";

type ActionKey = Exclude<keyof ProposalPermittedActionsDto, "updateDraft" | "generateRepresentation">;
type ActionKind =
  | "confirm"
  | "pricing"
  | "revision"
  | "justification"
  | "recipient"
  | "verbal"
  | "reason"
  | "agreement"
  | "replacement"
  | "supersede";
interface ActionDefinition {
  key: ActionKey;
  label: string;
  description: string;
  kind: ActionKind;
  emphasis?: boolean;
}
export const PROPOSAL_ACTIONS: readonly ActionDefinition[] = [
  {
    key: "attachPricingVersion",
    label: "Attach Pricing Version",
    description: "Select an immutable approved Pricing Version.",
    kind: "pricing"
  },
  {
    key: "saveVersion",
    label: "Save Version",
    description: "Freeze the current working Draft as a new immutable Version.",
    kind: "revision",
    emphasis: true
  },
  {
    key: "requestQualityReview",
    label: "Request Quality Review",
    description: "Send the current Version into Quality Review.",
    kind: "confirm",
    emphasis: true
  },
  {
    key: "submitForExecutiveAuthorization",
    label: "Submit for Executive Authorization",
    description: "Complete Internal Review and request Executive Authorization.",
    kind: "confirm",
    emphasis: true
  },
  {
    key: "approve",
    label: "Approve Proposal",
    description: "Approve the immutable Proposal Version under Executive Authorization.",
    kind: "confirm",
    emphasis: true
  },
  {
    key: "reject",
    label: "Reject Proposal",
    description: "Reject the Proposal during governance review.",
    kind: "confirm"
  },
  {
    key: "requestChanges",
    label: "Request changes",
    description: "Return this Proposal to Draft for changes.",
    kind: "confirm"
  },
  {
    key: "submitThroughQualityReview",
    label: "Complete Quality Review",
    description: "Submit the reviewed immutable Version.",
    kind: "confirm",
    emphasis: true
  },
  {
    key: "submitThroughExecutiveAuthorization",
    label: "Executive Authorization",
    description: "Submit through Executive Authorization with permanent Business Justification.",
    kind: "justification",
    emphasis: true
  },
  {
    key: "recordViewed",
    label: "Record viewed",
    description: "Record verified Client viewing evidence.",
    kind: "confirm"
  },
  {
    key: "recordClientAcceptance",
    label: "Record Client acceptance",
    description: "Record acceptance by an authorized recipient.",
    kind: "recipient",
    emphasis: true
  },
  {
    key: "recordVerbalAcceptance",
    label: "Record verbal acceptance",
    description: "Record attributable verbal acceptance evidence.",
    kind: "verbal"
  },
  {
    key: "withdrawAcceptance",
    label: "Withdraw acceptance",
    description: "Withdraw the current acceptance and retain the evidence.",
    kind: "reason"
  },
  {
    key: "linkExecutedAgreement",
    label: "Link executed Agreement",
    description: "Link the existing executed Agreement identifier.",
    kind: "agreement"
  },
  {
    key: "decline",
    label: "Record decline",
    description: "Record the Client decision to decline this offer.",
    kind: "confirm"
  },
  {
    key: "expire",
    label: "Expire Proposal",
    description: "Record that the offer has reached its expiration.",
    kind: "confirm"
  },
  {
    key: "createReplacement",
    label: "Create replacement",
    description: "Create a replacement Proposal from this offer.",
    kind: "replacement"
  },
  {
    key: "supersede",
    label: "Supersede Proposal",
    description: "Supersede this Proposal with an already submitted replacement UUID.",
    kind: "supersede"
  },
  {
    key: "archive",
    label: "Archive Proposal",
    description: "Archive this business record without deleting its history.",
    kind: "confirm"
  }
];

export function availableProposalActions(permitted: ProposalPermittedActionsDto) {
  return PROPOSAL_ACTIONS.filter(({ key }) => permitted[key]);
}

export function canonicalProposalPath(proposalId: string) {
  return `/proposals/${encodeURIComponent(proposalId)}`;
}

function CommandDialog({
  action,
  proposal,
  busy,
  error,
  onCancel,
  onSubmit
}: {
  action: ActionDefinition | null;
  proposal: ProposalDetailDto;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!action) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = backdropRef.current;
    const page = backdrop?.parentElement;
    const background = page ? Array.from(page.children).filter((child) => child !== backdrop) : [];
    background.forEach((element) => {
      (element as HTMLElement).inert = true;
    });
    const initial = backdrop?.querySelector<HTMLElement>(
      "[data-initial-focus], button, input, select, textarea"
    );
    initial?.focus();
    return () => {
      background.forEach((element) => {
        (element as HTMLElement).inert = false;
      });
      previousFocus?.focus();
    };
  }, [action]);
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!busy) onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      backdropRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
      ) ?? []
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (!action) return null;
  const recipients = proposal.draft.recipients;
  return (
    <div
      aria-labelledby="proposal-command-title"
      aria-modal="true"
      className="dialog-backdrop"
      onKeyDown={handleKeyDown}
      ref={backdropRef}
      role="dialog"
    >
      <form className="proposal-command-dialog" onSubmit={onSubmit}>
        <h2 id="proposal-command-title">{action.label}</h2>
        <p>{action.description}</p>
        {error ? (
          <p className="proposal-command-error" role="alert">
            {error}
          </p>
        ) : null}
        {action.kind === "revision" ? (
          <label className="workspace-field">
            <span>Revision reason</span>
            <textarea
              className="workspace-textarea"
              data-initial-focus
              maxLength={2000}
              name="revisionReason"
            />
          </label>
        ) : null}
        {action.kind === "pricing" ? (
          <>
            <label className="workspace-field">
              <span>Pricing Project ID</span>
              <input
                className="workspace-input"
                data-initial-focus
                name="pricingProjectId"
                required
              />
            </label>
            <label className="workspace-field">
              <span>Pricing Version ID</span>
              <input className="workspace-input" name="pricingVersionId" required />
            </label>
          </>
        ) : null}
        {action.kind === "justification" ? (
          <label className="workspace-field">
            <span>Business Justification</span>
            <textarea
              className="workspace-textarea"
              data-initial-focus
              maxLength={5000}
              name="businessJustification"
              required
            />
          </label>
        ) : null}
        {["recipient", "verbal"].includes(action.kind) ? (
          <label className="workspace-field">
            <span>Authorized recipient</span>
            <select className="workspace-input" data-initial-focus name="recipientId" required>
              <option value="">Select recipient</option>
              {recipients.map((recipient) => (
                <option key={recipient.recipientId} value={recipient.recipientId}>
                  {recipient.name} · {recipient.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {action.kind === "recipient" ? (
          <label className="workspace-field">
            <span>Acceptance notes</span>
            <textarea className="workspace-textarea" maxLength={5000} name="notes" />
          </label>
        ) : null}
        {action.kind === "verbal" ? (
          <>
            <label className="workspace-field">
              <span>Acceptance reason</span>
              <textarea className="workspace-textarea" maxLength={2000} name="reason" required />
            </label>
            <label className="workspace-field">
              <span>Acceptance notes</span>
              <textarea className="workspace-textarea" maxLength={5000} name="notes" required />
            </label>
          </>
        ) : null}
        {action.kind === "reason" ? (
          <label className="workspace-field">
            <span>Withdrawal reason</span>
            <textarea
              className="workspace-textarea"
              data-initial-focus
              maxLength={2000}
              name="reason"
              required
            />
          </label>
        ) : null}
        {action.kind === "agreement" ? (
          <label className="workspace-field">
            <span>Agreement ID</span>
            <input
              className="workspace-input"
              data-initial-focus
              maxLength={128}
              name="agreementId"
              required
            />
          </label>
        ) : null}
        {action.kind === "supersede" ? (
          <label className="workspace-field">
            <span>Replacement Proposal UUID</span>
            <input
              className="workspace-input"
              data-initial-focus
              name="replacementProposalId"
              pattern="[0-9a-fA-F-]{36}"
              required
            />
          </label>
        ) : null}
        {action.kind === "replacement" ? (
          <>
            <label className="workspace-field">
              <span>Replacement title</span>
              <input className="workspace-input" data-initial-focus maxLength={200} name="title" />
            </label>
            <label className="workspace-field">
              <span>Owner ID</span>
              <input className="workspace-input" maxLength={128} name="ownerId" />
            </label>
            <label className="workspace-field">
              <span>Expiration</span>
              <input className="workspace-input" name="expirationAt" type="datetime-local" />
            </label>
            <label className="workspace-field">
              <span>Expiration override reason</span>
              <textarea
                className="workspace-textarea"
                maxLength={2000}
                name="expirationOverrideReason"
              />
            </label>
          </>
        ) : null}
        <div className="proposal-form-actions">
          <button
            className="workspace-button workspace-button-secondary"
            data-initial-focus={action.kind === "confirm" ? true : undefined}
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button className="workspace-button" disabled={busy} type="submit">
            {busy ? "Working…" : action.label}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProposalDetailView({
  proposal,
  editingDraft = false,
  busy = false,
  commandError = null,
  activeAction = null,
  onEditDraft = () => undefined,
  onCancelDraft = () => undefined,
  onDraftSubmit = () => undefined,
  onAction = () => undefined,
  onCancelAction = () => undefined,
  onCommandSubmit = () => undefined,
  onReload = () => undefined
}: {
  proposal: ProposalDetailDto;
  editingDraft?: boolean;
  busy?: boolean;
  commandError?: string | null;
  activeAction?: ActionDefinition | null;
  onEditDraft?: () => void;
  onCancelDraft?: () => void;
  onDraftSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onAction?: (action: ActionDefinition) => void;
  onCancelAction?: () => void;
  onCommandSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  onReload?: () => void;
}) {
  const actions = availableProposalActions(proposal.permittedActions);
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow={proposal.proposalNumber}
        title={proposal.title}
        description={`Current Version ${proposal.currentVersionNumber ?? "not saved"} · Expires ${new Date(proposal.expirationAt).toLocaleString()}`}
        actions={<StatusBadge status={proposal.status} />}
      />
      {commandError && !activeAction ? (
        <div className="proposal-command-error" role="alert">
          {commandError}{" "}
          <button className="table-primary-link" onClick={onReload} type="button">
            Reload Proposal
          </button>
        </div>
      ) : null}
      {actions.length ? (
        <section aria-label="Available Proposal actions" className="proposal-actions">
          <div>
            <p className="workspace-eyebrow">Authoritative available actions</p>
            <p>Availability is supplied by the Proposal API.</p>
          </div>
          <div>
            {actions.map((action) => (
              <button
                className={`workspace-button${action.emphasis ? "" : " workspace-button-secondary"}`}
                disabled={busy}
                key={action.key}
                onClick={() => onAction(action)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="workspace-card-grid">
        <Card label="Client" value={proposal.clientId} />
        <Card label="Owner" value={proposal.ownerId} />
        <Card label="Engagement type" value={proposal.engagementTypeCode.replaceAll("_", " ")} />
        <Card
          label="Version history"
          value={`${proposal.versionCount} Version${proposal.versionCount === 1 ? "" : "s"}`}
        />
      </div>
      <DraftPanel
        editing={editingDraft}
        onCancel={onCancelDraft}
        onEdit={onEditDraft}
        onSubmit={onDraftSubmit}
        proposal={proposal}
      />
      <PricingPanel proposal={proposal} />
      <EvidencePanels proposal={proposal} />
      <CommandDialog
        action={activeAction}
        busy={busy}
        error={commandError}
        onCancel={onCancelAction}
        onSubmit={onCommandSubmit}
        proposal={proposal}
      />
    </div>
  );
}

function optional(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim() || undefined;
}
function isoLocal(value: string | undefined) {
  return value ? new Date(value).toISOString() : undefined;
}

export function ProposalDetailScreen({
  companyId,
  proposalId
}: {
  companyId: string;
  proposalId: string;
}) {
  const api = useMemo(() => new ProposalApiClient(companyId), [companyId]);
  const { notify } = useToast();
  const [proposal, setProposal] = useState<ProposalDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [action, setAction] = useState<ActionDefinition | null>(null);
  const [busy, setBusy] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProposal(await api.load(proposalId));
    } catch (caught) {
      setError(
        caught instanceof WorkspaceApiError ? caught.message : "Proposal could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [api, proposalId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function apply(
    command: Promise<ProposalCommandResponse>,
    message: string,
    canonicalize = false
  ) {
    setBusy(true);
    setCommandError(null);
    try {
      const response = await command;
      setProposal(response.proposal);
      setAction(null);
      setEditingDraft(false);
      if (canonicalize && response.proposal.id !== proposalId)
        window.history.pushState(null, "", canonicalProposalPath(response.proposal.id));
      notify(
        response.idempotentReplay ? `${message} Previous request result restored.` : message,
        "success"
      );
    } catch (caught) {
      const failure =
        caught instanceof WorkspaceApiError
          ? caught
          : new WorkspaceApiError("REQUEST_FAILED", "The command could not be completed.", 0);
      setCommandError(
        failure.status === 409
          ? `${failure.message} Reload the Proposal before retrying if its state changed.`
          : failure.message
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function submitDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposal || busyRef.current) return;
    busyRef.current = true;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title"));
    const sections = proposal.draft.structuredContent.sections.map((section, index) => ({
      ...section,
      heading: String(form.get(`section.${index}.heading`) ?? ""),
      body: String(form.get(`section.${index}.body`) ?? ""),
      clientVisible: form.has(`section.${index}.clientVisible`)
    }));
    const commercialTerms = Object.fromEntries(
      Object.keys(proposal.draft.commercialTerms).map((key) => [
        key,
        String(form.get(`term.${key}`) ?? "")
      ])
    ) as unknown as ProposalDetailDto["draft"]["commercialTerms"];
    const recipients = proposal.draft.recipients.map((recipient, index) => ({
      ...recipient,
      name: String(form.get(`recipient.${index}.name`)),
      email: String(form.get(`recipient.${index}.email`)),
      authorizedToAccept: form.has(`recipient.${index}.authorizedToAccept`)
    }));
    void apply(
      api.updateDraft(proposal.id, {
        title,
        expirationAt: isoLocal(optional(form, "expirationAt")),
        expirationOverrideReason: optional(form, "expirationOverrideReason") ?? null,
        content: { ...proposal.draft.structuredContent, title, sections },
        commercialTerms,
        recipients
      }),
      "Working Draft saved."
    );
  }

  function submitCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposal || !action || busyRef.current) return;
    busyRef.current = true;
    const form = new FormData(event.currentTarget);
    const id = proposal.id;
    let command: Promise<ProposalCommandResponse> | undefined;
    switch (action.key) {
      case "attachPricingVersion":
        command = api.attachPricingVersion(
          id,
          String(form.get("pricingProjectId")),
          String(form.get("pricingVersionId"))
        );
        break;
      case "saveVersion":
        command = api.saveVersion(id, optional(form, "revisionReason"));
        break;
      case "requestQualityReview":
        command = api.requestQualityReview(id);
        break;
      case "submitForExecutiveAuthorization":
        command = api.submitForExecutiveAuthorization(id);
        break;
      case "approve":
        command = api.approve(id);
        break;
      case "reject":
        command = api.reject(id);
        break;
      case "requestChanges":
        command = api.requestChanges(id);
        break;
      case "submitThroughQualityReview":
        command = api.submitThroughQualityReview(id);
        break;
      case "submitThroughExecutiveAuthorization":
        command = api.submitThroughExecutiveAuthorization(
          id,
          String(form.get("businessJustification"))
        );
        break;
      case "recordViewed":
        command = api.recordViewed(id);
        break;
      case "recordClientAcceptance":
        command = api.recordClientAcceptance(id, {
          recipientId: String(form.get("recipientId")),
          notes: optional(form, "notes")
        });
        break;
      case "recordVerbalAcceptance":
        command = api.recordVerbalAcceptance(id, {
          recipientId: String(form.get("recipientId")),
          reason: String(form.get("reason")),
          notes: String(form.get("notes"))
        });
        break;
      case "withdrawAcceptance":
        command = api.withdrawAcceptance(id, String(form.get("reason")));
        break;
      case "linkExecutedAgreement":
        command = api.linkExecutedAgreement(id, String(form.get("agreementId")));
        break;
      case "decline":
        command = api.decline(id);
        break;
      case "expire":
        command = api.expire(id);
        break;
      case "createReplacement":
        command = api.createReplacement(id, {
          ownerId: optional(form, "ownerId"),
          title: optional(form, "title"),
          expirationAt: isoLocal(optional(form, "expirationAt")),
          expirationOverrideReason: optional(form, "expirationOverrideReason")
        });
        break;
      case "supersede":
        command = api.supersede(id, String(form.get("replacementProposalId")));
        break;
      case "archive":
        command = api.archive(id);
        break;
    }
    if (!command) { busyRef.current = false; return; }
    void apply(command, `${action.label} completed.`, action.key === "createReplacement");
  }

  if (loading) return <LoadingState label="Loading Proposal workspace" />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!proposal)
    return (
      <EmptyState title="Proposal unavailable" description="The Proposal API returned no record." />
    );
  return (
    <>
      <ProposalDetailView
      activeAction={action}
      busy={busy}
      commandError={commandError}
      editingDraft={editingDraft}
      onAction={(next) => {
        setCommandError(null);
        setAction(next);
      }}
      onCancelAction={() => {
        if (!busy) {
          setAction(null);
          setCommandError(null);
        }
      }}
      onCancelDraft={() => setEditingDraft(false)}
      onCommandSubmit={submitCommand}
      onDraftSubmit={submitDraft}
      onEditDraft={() => setEditingDraft(true)}
      onReload={() => {
        setAction(null);
        setCommandError(null);
        void load();
      }}
        proposal={proposal}
      />
      <ProposalRepresentationsPanel companyId={companyId} proposal={proposal} />
      <ProposalDeliveriesPanel companyId={companyId} proposal={proposal} />
      <ProposalAgreementsPanel companyId={companyId} proposalId={proposal.id} />
    </>
  );
}
