import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/proposals/proposal-1" }));

import { WorkspaceChrome } from "./workspace-chrome";

describe("WorkspaceChrome", () => {
  it("renders the reusable authenticated workspace landmarks and navigation", () => {
    const markup = renderToStaticMarkup(<WorkspaceChrome userName="Avery Consultant"><section>Workspace content</section></WorkspaceChrome>);
    expect(markup).toContain('aria-label="Primary"');
    expect(markup).toContain('aria-label="Breadcrumb"');
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("Dashboard");
    expect(markup).toContain("Clients");
    expect(markup).toContain("Proposals");
    expect(markup).toContain("Pricing");
    expect(markup).toContain("Avery Consultant");
    expect(markup).toContain("Workspace content");
  });

  it("marks future modules unavailable and exposes responsive navigation controls", () => {
    const markup = renderToStaticMarkup(<WorkspaceChrome userName="Avery"><div /></WorkspaceChrome>);
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('aria-label="Open navigation"');
    expect(markup).toContain('aria-label="Mobile navigation"');
    expect(markup).toContain('aria-label="Toggle color theme"');
  });
});
