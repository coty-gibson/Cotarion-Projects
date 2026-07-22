import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <p className="workspace-eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="page-header-actions">{actions}</div> : null}</header>;
}

export function Panel({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return <section className={cn("workspace-panel", className)}>{title || description ? <header><div>{title ? <h2>{title}</h2> : null}{description ? <p>{description}</p> : null}</div></header> : null}<div className="workspace-panel-body">{children}</div></section>;
}

export function Card({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return <article className="workspace-card"><p>{label}</p><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}

export function LoadingState({ label = "Loading workspace data" }: { label?: string }) {
  return <div aria-busy="true" aria-live="polite" className="state-panel"><span className="loading-spinner" aria-hidden="true" /><p>{label}…</p></div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="state-panel state-empty"><span aria-hidden="true">○</span><h2>{title}</h2><p>{description}</p></div>;
}

export function ErrorState({ title = "Something went wrong", message, retry }: { title?: string; message: string; retry?: () => void }) {
  return <div aria-live="assertive" className="state-panel state-error" role="alert"><span aria-hidden="true">!</span><h2>{title}</h2><p>{message}</p>{retry ? <button className="workspace-button" onClick={retry} type="button">Try again</button> : null}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = ["ACCEPTED", "SUBMITTED"].includes(status) ? "positive" : ["DECLINED", "EXPIRED"].includes(status) ? "negative" : ["INTERNAL_REVIEW", "VIEWED"].includes(status) ? "attention" : "neutral";
  return <span className={`status-badge status-${tone}`}>{status.replaceAll("_", " ")}</span>;
}

export function DataTable({ caption, columns, children }: { caption: string; columns: readonly string[]; children: ReactNode }) {
  return <div className="data-table-wrap"><table className="data-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function Pagination({ hasPrevious, hasNext, onPrevious, onNext }: { hasPrevious: boolean; hasNext: boolean; onPrevious: () => void; onNext: () => void }) {
  return <nav aria-label="Pagination" className="workspace-pagination"><button className="workspace-button workspace-button-secondary" disabled={!hasPrevious} onClick={onPrevious} type="button">Previous</button><button className="workspace-button workspace-button-secondary" disabled={!hasNext} onClick={onNext} type="button">Next</button></nav>;
}

export interface TimelineItem { id: string; label: string; timestamp: string; detail?: string }
export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return <ol className="workspace-timeline">{items.map((item) => <li key={item.id}><span aria-hidden="true" /><div><strong>{item.label}</strong>{item.detail ? <p>{item.detail}</p> : null}<time dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleString()}</time></div></li>)}</ol>;
}

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="workspace-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cn("workspace-input", props.className)} />; }
export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={cn("workspace-input", props.className)} />; }

export function ConfirmDialog({ open, title, description, onCancel, onConfirm }: { open: boolean; title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div aria-labelledby="confirm-title" aria-modal="true" className="dialog-backdrop" role="dialog"><div className="confirm-dialog"><h2 id="confirm-title">{title}</h2><p>{description}</p><div><button className="workspace-button workspace-button-secondary" onClick={onCancel} type="button">Cancel</button><button className="workspace-button" onClick={onConfirm} type="button">Confirm</button></div></div></div>;
}
