// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PricingProjectsScreen } from "./pricing-projects-screen";
import { PricingCreateScreen, PricingEditScreen } from "./pricing-editor-screen";
import { PricingProjectDetailScreen } from "./pricing-project-detail-screen";
import { PricingReviewHistoryScreen, PricingVersionHistoryScreen } from "./pricing-history-screen";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), parameters: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push, replace: navigation.replace }), useSearchParams: () => navigation.parameters }));
function response(data: unknown, status = 200, code = "ERROR") { return Promise.resolve(new Response(JSON.stringify(status < 400 ? { data } : { error: { code, message: "Safe server message" } }), { status, headers: { "content-type": "application/json" } })); }
const summary = { id: "11111111-1111-4111-8111-111111111111", estimateNumber: "PP-000001", client: { id: "client-1", name: "Acme", clientNumber: "CLI-001" }, owner: { id: "owner-1", name: "Alex Owner", email: "alex@example.com" }, projectName: "Transformation Pricing", status: "DRAFT", pricingModel: "PROJECT", currentVersion: { id: "version-1", number: 1 }, lastUpdated: "2026-07-21T12:00:00.000Z" } as const;
const draft = { projectName: "Transformation Pricing", pricingModel: "PROJECT", currency: "USD", pricingConfigurationVersionId: "config-1", pricingConfigurationVersion: 1, configurationSchemaVersion: 1, engineVersion: "engine-1", methodologyVersion: "method-1", inputSnapshot: { scope: "complete" }, outputSnapshot: { total: "100.00" }, explanationSnapshot: { formula: "server" }, catalogSnapshot: { service: "advisory" } } as const;
const detail = { summary, draft: { projectName: draft.projectName, pricingModel: draft.pricingModel, currency: draft.currency, pricingConfigurationVersionId: draft.pricingConfigurationVersionId, pricingConfigurationVersion: 1, configurationSchemaVersion: 1, engineVersion: draft.engineVersion, methodologyVersion: draft.methodologyVersion, lastUpdated: summary.lastUpdated }, approvedVersion: null, reviewCandidate: null, versionCount: 1, versions: [], reviews: [], permittedActions: ["EDIT_DRAFT", "SAVE_VERSION", "REQUEST_QUALITY_REVIEW", "APPROVE", "REJECT", "BEGIN_REVISION", "ARCHIVE"] };
const editable = { pricingProjectId: summary.id, estimateNumber: summary.estimateNumber, client: summary.client, owner: summary.owner, draft, concurrencyToken: "opaque-current", permittedActions: ["EDIT_DRAFT"] };
const command = { pricingProject: { ...summary, companyId: "company-1", clientId: "client-1", ownerId: "owner-1", currency: "USD", draftCurrency: 1, versionCount: 2, latestVersionNumber: 2, reviewCandidate: null, approvedVersion: null }, concurrencyToken: "opaque-next", idempotentReplay: false };

beforeEach(() => { navigation.push.mockReset(); navigation.replace.mockReset(); navigation.parameters = new URLSearchParams(); }); afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Pricing Phase 6 workspace", () => {
  it("renders list results, navigates by link, and shows an empty state", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => response({ items: [summary], page: 1, pageSize: 20, total: 1, totalPages: 1 })); vi.stubGlobal("fetch", fetcher); const { unmount } = render(<PricingProjectsScreen companyId="company-1" />);
    expect(await screen.findByText("PP-000001")).toHaveAttribute("href", `/pricing-projects/${summary.id}`); expect(screen.getByText("Transformation Pricing")).toBeInTheDocument(); unmount();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(() => response({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 })));
    render(<PricingProjectsScreen companyId="company-1" />); expect(await screen.findByText("No Pricing Projects found")).toBeInTheDocument();
  });
  it("sends search, filters, sorting, and pagination from the list controls", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => response({ items: [summary], page: 1, pageSize: 20, total: 40, totalPages: 2 })); vi.stubGlobal("fetch", fetcher); render(<PricingProjectsScreen companyId="company-1" />); await screen.findByText("PP-000001");
    fireEvent.change(screen.getByLabelText("Search Pricing Projects"), { target: { value: "Acme" } }); fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "DRAFT" } }); fireEvent.change(screen.getByLabelText("Filter by Pricing model"), { target: { value: "PROJECT" } }); fireEvent.change(screen.getByLabelText("Sort Pricing Projects"), { target: { value: "projectName" } }); fireEvent.change(screen.getByLabelText("Sort direction"), { target: { value: "asc" } }); fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(fetcher.mock.calls.some(([url]) => String(url).includes("search=Acme") && String(url).includes("status=DRAFT") && String(url).includes("pricingModel=PROJECT") && String(url).includes("sortBy=projectName") && String(url).includes("sortDirection=asc"))).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Next" })); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => String(url).includes("page=2"))).toBe(true));
  });
  it("renders detail navigation metadata without loading the edit projection", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => response(detail)); vi.stubGlobal("fetch", fetcher); render(<PricingProjectDetailScreen companyId="company-1" pricingProjectId={summary.id} />);
    expect(await screen.findByText("Draft metadata")).toBeInTheDocument(); expect(screen.getAllByText("Transformation Pricing")).toHaveLength(2); expect(screen.getByText("Version History")).toHaveAttribute("href", `/pricing-projects/${summary.id}/versions`); expect(fetcher).toHaveBeenCalledTimes(1); expect(String(fetcher.mock.calls[0][0])).not.toContain("/edit");
  });
  it("renders only server-permitted Pricing actions", async () => {
    const projected = { ...detail, permittedActions: ["BEGIN_REVISION"] };
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(() => response(projected)));
    render(<PricingProjectDetailScreen companyId="company-1" pricingProjectId={summary.id} />);
    expect(await screen.findByRole("button", { name: "Begin Revision" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve Version" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Version" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit Draft" })).not.toBeInTheDocument();
  });
  it("populates the full Draft editor, submits snapshots and token, then retains the refreshed token", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((url, init) => init?.method === "PATCH" ? response(command) : response(editable)); vi.stubGlobal("fetch", fetcher); render(<PricingEditScreen companyId="company-1" pricingProjectId={summary.id} />);
    expect(await screen.findByDisplayValue("Transformation Pricing")).toBeInTheDocument(); expect(screen.getByLabelText("inputSnapshot")).toHaveValue(JSON.stringify(draft.inputSnapshot, null, 2)); fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await screen.findByText(/Pricing Draft saved/); const first = JSON.parse(String(fetcher.mock.calls.find(([, init]) => init?.method === "PATCH")?.[1]?.body)); expect(first).toEqual({ draft, concurrencyToken: "opaque-current" });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" })); await waitFor(() => { const patches = fetcher.mock.calls.filter(([, init]) => init?.method === "PATCH"); expect(JSON.parse(String(patches[1][1]?.body)).concurrencyToken).toBe("opaque-next"); });
  });
  it("creates a Pricing Project through HTTP and navigates to its authoritative editor", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() => response(command)); vi.stubGlobal("fetch", fetcher); render(<PricingCreateScreen companyId="company-1" />);
    fireEvent.change(screen.getByLabelText("Client ID"), { target: { value: "client-1" } }); fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "New Pricing" } }); fireEvent.change(screen.getByLabelText("Configuration ID"), { target: { value: "config-1" } }); fireEvent.change(screen.getByLabelText("Engine version"), { target: { value: "engine-1" } }); fireEvent.change(screen.getByLabelText("Methodology version"), { target: { value: "method-1" } }); fireEvent.click(screen.getByRole("button", { name: "Create Pricing Project" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(`/pricing-projects/${command.pricingProject.id}/edit?created=1`)); const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body)); expect(body.clientId).toBe("client-1"); expect(body.draft).toMatchObject({ projectName: "New Pricing", inputSnapshot: {}, catalogSnapshot: {} });
  });
  it("shows a concurrency conflict and reloads the authoritative editable Draft without resubmitting", async () => {
    let editLoads = 0; const fetcher = vi.fn<typeof fetch>().mockImplementation((url, init) => { if (init?.method === "PATCH") return response({}, 409, "OPTIMISTIC_CONCURRENCY_CONFLICT"); editLoads += 1; return response({ ...editable, concurrencyToken: editLoads === 1 ? "stale" : "fresh" }); }); vi.stubGlobal("fetch", fetcher); render(<PricingEditScreen companyId="company-1" pricingProjectId={summary.id} />); await screen.findByDisplayValue("Transformation Pricing"); fireEvent.click(screen.getByRole("button", { name: "Save Draft" })); expect(await screen.findByText("Reload required")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Reload latest Draft" })); await waitFor(() => expect(editLoads).toBe(2)); expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  });
  it("executes commands, refreshes detail, submits rejection findings, and confirms Archive", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((url, init) => { if (String(url).endsWith("/edit")) return response(editable); if (init?.method === "POST") return response(command); return response(detail); }); vi.stubGlobal("fetch", fetcher); render(<PricingProjectDetailScreen companyId="company-1" pricingProjectId={summary.id} />); await screen.findByText("Pricing commands");
    for (const name of ["Save Version", "Request Quality Review", "Approve Version", "Begin Revision"]) { fireEvent.click(screen.getByRole("button", { name })); await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument()); }
    fireEvent.click(screen.getByRole("button", { name: "Reject Version" })); fireEvent.change(screen.getByLabelText("Finding"), { target: { value: "Correct scope" } }); fireEvent.click(screen.getAllByRole("button", { name: "Reject Version" })[1]); await waitFor(() => expect(fetcher.mock.calls.some(([, init]) => String(init?.body).includes("Correct scope"))).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Archive Project" })); expect(screen.getByRole("dialog")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Confirm" })); await waitFor(() => expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/archive"))).toBe(true));
  });
  it("renders Version and Review history projections and their empty states", async () => {
    const version = { id: "version-1", number: 1, createdAt: summary.lastUpdated, createdBy: { id: "owner-1", name: "Alex Owner" }, approvalStatus: "APPROVED", reviewer: { id: "reviewer-1", name: "Riley Reviewer" }, reviewedAt: summary.lastUpdated, revisionOriginVersionId: null } as const; const review = { type: "REJECTED", pricingVersionId: "version-1", versionNumber: 1, actor: { id: "reviewer-1", name: "Riley Reviewer" }, findings: "Correct scope", occurredAt: summary.lastUpdated } as const;
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation((url) => response(String(url).endsWith("versions") ? [version] : [review]))); const { unmount } = render(<PricingVersionHistoryScreen companyId="company-1" pricingProjectId={summary.id} />); expect(await screen.findByText("Riley Reviewer")).toBeInTheDocument(); unmount(); render(<PricingReviewHistoryScreen companyId="company-1" pricingProjectId={summary.id} />); expect(await screen.findByText("Correct scope")).toBeInTheDocument();
  });
  it.each([[400, "Safe server message"], [401, "session has ended"], [403, "permission"], [404, "could not be found"], [500, "temporarily unavailable"]])("renders a safe query error for HTTP %s", async (status, message) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(() => response({}, status as number, status === 401 ? "NOT_AUTHENTICATED" : "ERROR"))); render(<PricingProjectsScreen companyId="company-1" />); expect(await screen.findByText(new RegExp(message, "i"))).toBeInTheDocument();
  });
});
