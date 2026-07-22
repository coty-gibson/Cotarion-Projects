import React from "react";
import Link from "next/link";
import type { ProposalDetailDto } from "@/presentation/api/proposal-api-client";
import { DataTable, EmptyState, Panel, StatusBadge, Timeline } from "@/presentation/components/ui/workspace-primitives";

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function when(timestamp: string | null) {
  return timestamp ? <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time> : <span className="muted-value">Not recorded</span>;
}

export function DraftPanel({ proposal, editing, onEdit, onCancel, onSubmit }: {
  proposal: ProposalDetailDto; editing: boolean; onEdit: () => void; onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const draft = proposal.draft;
  return <Panel title="Working Draft" description="The current mutable offer. Immutable Versions are shown separately.">
    {editing ? <form className="proposal-form" onSubmit={onSubmit}>
      <label className="workspace-field"><span>Proposal title</span><input className="workspace-input" defaultValue={draft.title} maxLength={200} name="title" required /></label>
      <label className="workspace-field"><span>Expiration</span><input className="workspace-input" defaultValue={draft.expirationAt.slice(0, 16)} name="expirationAt" type="datetime-local" required /></label>
      <label className="workspace-field proposal-span"><span>Expiration override reason</span><textarea className="workspace-textarea" defaultValue={draft.expirationOverrideReason ?? ""} maxLength={2000} name="expirationOverrideReason" /></label>
      <fieldset className="proposal-fieldset proposal-span"><legend>Structured content</legend>{draft.structuredContent.sections.map((section, index) => <div className="proposal-section-editor" key={section.sectionId}>
        <input name={`section.${index}.sectionId`} type="hidden" value={section.sectionId} /><input name={`section.${index}.sectionType`} type="hidden" value={section.sectionType} /><input name={`section.${index}.displayOrder`} type="hidden" value={section.displayOrder} />
        <label className="workspace-field"><span>Heading</span><input className="workspace-input" defaultValue={section.heading} maxLength={500} name={`section.${index}.heading`} /></label>
        <label className="workspace-field"><span>Body</span><textarea className="workspace-textarea" defaultValue={section.body} maxLength={10000} name={`section.${index}.body`} /></label>
        <label className="proposal-check"><input defaultChecked={section.clientVisible} name={`section.${index}.clientVisible`} type="checkbox" /> Client visible</label>
      </div>)}</fieldset>
      <fieldset className="proposal-fieldset proposal-span"><legend>Commercial terms</legend><div className="proposal-form">{Object.entries(draft.commercialTerms).map(([key, current]) => <label className="workspace-field" key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><textarea className="workspace-textarea" defaultValue={current} maxLength={10000} name={`term.${key}`} /></label>)}</div></fieldset>
      <fieldset className="proposal-fieldset proposal-span"><legend>Recipients</legend>{draft.recipients.map((recipient, index) => <div className="proposal-recipient" key={recipient.recipientId}>
        <input name={`recipient.${index}.recipientId`} type="hidden" value={recipient.recipientId} /><input name={`recipient.${index}.contactId`} type="hidden" value={recipient.contactId ?? ""} />
        <label className="workspace-field"><span>Name</span><input className="workspace-input" defaultValue={recipient.name} maxLength={200} name={`recipient.${index}.name`} required /></label>
        <label className="workspace-field"><span>Email</span><input className="workspace-input" defaultValue={recipient.email} maxLength={320} name={`recipient.${index}.email`} required type="email" /></label>
        <label className="proposal-check"><input defaultChecked={recipient.authorizedToAccept} name={`recipient.${index}.authorizedToAccept`} type="checkbox" /> Authorized to accept</label>
      </div>)}</fieldset>
      <div className="proposal-form-actions proposal-span"><button className="workspace-button workspace-button-secondary" onClick={onCancel} type="button">Cancel</button><button className="workspace-button" type="submit">Save Draft</button></div>
    </form> : <>
      <dl className="detail-list"><div><dt>Title</dt><dd>{draft.title}</dd></div><div><dt>Expiration</dt><dd>{when(draft.expirationAt)}</dd></div><div><dt>Override reason</dt><dd>{draft.expirationOverrideReason ?? "—"}</dd></div></dl>
      <div className="proposal-content-sections">{draft.structuredContent.sections.length ? draft.structuredContent.sections.map((section) => <article key={section.sectionId}><small>{section.sectionType.replaceAll("_", " ")}{section.clientVisible ? " · Client visible" : ""}</small><h3>{section.heading}</h3><p>{section.body}</p></article>) : <p className="muted-value">No structured sections.</p>}</div>
      <h3 className="proposal-subheading">Commercial terms</h3><dl className="detail-list">{Object.entries(draft.commercialTerms).map(([key, current]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{current || "—"}</dd></div>)}</dl>
      <h3 className="proposal-subheading">Recipients</h3>{draft.recipients.length ? <DataTable caption="Proposal recipients" columns={["Recipient", "Email", "Acceptance authority"]}>{draft.recipients.map((recipient) => <tr key={recipient.recipientId}><td>{recipient.name}</td><td>{recipient.email}</td><td>{recipient.authorizedToAccept ? "Authorized" : "Not authorized"}</td></tr>)}</DataTable> : <EmptyState title="No recipients" description="No Proposal recipients are recorded." />}
      {proposal.permittedActions.updateDraft ? <div className="proposal-panel-action"><button className="workspace-button" onClick={onEdit} type="button">Edit working Draft</button></div> : null}
    </>}
  </Panel>;
}

export function PricingPanel({ proposal }: { proposal: ProposalDetailDto }) {
  const pricing = proposal.draft.pricingSnapshot;
  return <Panel title="Pricing snapshot" description="Immutable evidence captured from the authoritative Pricing Project; no values are recalculated here."><dl className="detail-list">
    <div><dt>Pricing Project</dt><dd>{pricing.pricingProjectNumber} · {pricing.pricingProjectId}</dd></div><div><dt>Model</dt><dd>{pricing.pricingModel.replaceAll("_", " ")}</dd></div><div><dt>Methodology</dt><dd>{pricing.methodologyVersion}</dd></div><div><dt>Engine</dt><dd>{pricing.engineVersion}</dd></div><div><dt>Configuration</dt><dd>Version {pricing.pricingConfigurationVersion}</dd></div><div><dt>Approved</dt><dd>{when(pricing.approvedAt)} by {pricing.approvedByUserId}</dd></div>
    {Object.entries(pricing.outputSnapshot ?? {}).map(([key, output]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value(output)}</dd></div>)}
  </dl></Panel>;
}

export function EvidencePanels({ proposal }: { proposal: ProposalDetailDto }) {
  return <>
    <Panel title="Immutable Versions" description="Saved evidence; Versions cannot be edited.">{proposal.versions.length ? <DataTable caption="Proposal Versions" columns={["Version", "Status", "Created", "Submitted", "Revision reason"]}>{proposal.versions.map((version) => <tr key={version.id}><td>Version {version.number}{proposal.currentVersionId === version.id ? " · Current" : ""}</td><td><StatusBadge status={version.status} /></td><td>{when(version.createdAt)}<br /><small>{version.createdByUserId}</small></td><td>{when(version.submittedAt)}{version.submittedByUserId ? <><br /><small>{version.submittedByUserId}</small></> : null}</td><td>{version.revisionReason ?? "—"}</td></tr>)}</DataTable> : <EmptyState title="No Versions" description="No immutable Proposal Version has been saved." />}</Panel>
    <div className="workspace-two-column">
      <Panel title="Quality Review" description="Review evidence supplied by the Proposal API."><dl className="detail-list"><div><dt>Status</dt><dd><StatusBadge status={proposal.review.status} /></dd></div><div><dt>Requested</dt><dd>{when(proposal.review.requestedAt)}{proposal.review.requestedByUserId ? ` by ${proposal.review.requestedByUserId}` : ""}</dd></div><div><dt>Reviewed</dt><dd>{when(proposal.review.reviewedAt)}{proposal.review.reviewedByUserId ? ` by ${proposal.review.reviewedByUserId}` : ""}</dd></div><div><dt>Outcome</dt><dd>{proposal.review.outcome?.replaceAll("_", " ") ?? "—"}</dd></div></dl></Panel>
      <Panel title="Executive Authorization" description="Recorded authorization evidence; no pending workflow is inferred."><dl className="detail-list"><div><dt>Status</dt><dd><StatusBadge status={proposal.executiveAuthorization.status} /></dd></div><div><dt>Authorized</dt><dd>{when(proposal.executiveAuthorization.authorizedAt)}{proposal.executiveAuthorization.authorizedByUserId ? ` by ${proposal.executiveAuthorization.authorizedByUserId}` : ""}</dd></div><div><dt>Business Justification</dt><dd>{proposal.executiveAuthorization.businessJustification ?? "—"}</dd></div></dl></Panel>
    </div>
    <Panel title="Acceptance and Agreement evidence" description="Client decisions and retained withdrawal evidence from the authoritative read model."><dl className="detail-list"><div><dt>Viewed</dt><dd>{when(proposal.acceptance.viewedAt)}</dd></div><div><dt>Declined</dt><dd>{when(proposal.acceptance.declinedAt)}</dd></div><div><dt>Agreement</dt><dd>{proposal.acceptance.executedAgreementId ?? "No Agreement linked"}</dd></div></dl>
      {proposal.acceptance.acceptances.length ? <DataTable caption="Proposal acceptances" columns={["Acceptance", "Channel", "Recipient", "Recorded", "Current"]}>{proposal.acceptance.acceptances.map((item) => <tr key={item.acceptanceId}><td>{item.acceptanceId}</td><td>{item.channel.replaceAll("_", " ")}</td><td>{item.recipientId}</td><td>{when(item.occurredAt)}</td><td>{item.current ? "Current" : "Historical"}</td></tr>)}</DataTable> : <p className="muted-value">No acceptance evidence recorded.</p>}
      {proposal.acceptance.withdrawals.length ? <><h3 className="proposal-subheading">Withdrawals</h3><ul className="proposal-evidence-list">{proposal.acceptance.withdrawals.map((item) => <li key={item.withdrawalId}><strong>{item.reason}</strong><span>{when(item.occurredAt)} · {item.recordedByUserId}</span></li>)}</ul></> : null}
    </Panel>
    <div className="workspace-two-column"><Panel title="Relationships"><dl className="detail-list"><div><dt>Replaces</dt><dd>{proposal.supersedesProposalId ? <Link className="table-primary-link" href={`/proposals/${proposal.supersedesProposalId}`}>{proposal.supersedesProposalId}</Link> : "—"}</dd></div><div><dt>Superseded by</dt><dd>{proposal.supersededByProposalId ? <Link className="table-primary-link" href={`/proposals/${proposal.supersededByProposalId}`}>{proposal.supersededByProposalId}</Link> : "—"}</dd></div></dl></Panel>
      <Panel title="Public timeline" description="Safe, ordered activity projected by the server.">{proposal.timeline.length ? <Timeline items={proposal.timeline.map((item) => ({ id: item.id, label: item.label, timestamp: item.occurredAt, detail: item.summary }))} /> : <p className="muted-value">No public timeline evidence.</p>}</Panel></div>
  </>;
}
