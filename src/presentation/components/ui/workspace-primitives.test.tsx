import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmDialog, DataTable, EmptyState, ErrorState, LoadingState, Pagination, StatusBadge, Timeline } from "./workspace-primitives";

describe("workspace primitives", () => {
  it("provides accessible loading, error, pagination, and dialog semantics", () => {
    const markup = renderToStaticMarkup(<><LoadingState label="Loading records" /><ErrorState message="Unavailable" retry={() => undefined} /><Pagination hasNext={false} hasPrevious={false} onNext={() => undefined} onPrevious={() => undefined} /><ConfirmDialog open title="Confirm action" description="Continue?" onCancel={() => undefined} onConfirm={() => undefined} /></>);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-label="Pagination"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("disabled");
  });

  it("renders reusable tabular, status, empty, and timeline content", () => {
    const markup = renderToStaticMarkup(<><DataTable caption="Records" columns={["Name"]}><tr><td>Acme</td></tr></DataTable><StatusBadge status="INTERNAL_REVIEW" /><EmptyState title="No records" description="Nothing matched." /><Timeline items={[{ id: "created", label: "Created", timestamp: "2026-07-21T12:00:00.000Z" }]} /></>);
    expect(markup).toContain("<caption");
    expect(markup).toContain('scope="col"');
    expect(markup).toContain("INTERNAL REVIEW");
    expect(markup).toContain("No records");
    expect(markup).toContain('dateTime="2026-07-21T12:00:00.000Z"');
  });
});
