import { describe, expect, it, vi } from "vitest";
import { PricingApiClient, PricingApiError, type PricingDraftDto } from "./pricing-api-client";

const draft: PricingDraftDto = { projectName: "Pricing UX", pricingModel: "PROJECT", currency: "USD", pricingConfigurationVersionId: "config-1", pricingConfigurationVersion: 1, configurationSchemaVersion: 1, engineVersion: "engine-1", methodologyVersion: "method-1", inputSnapshot: { input: true }, outputSnapshot: { total: "100" }, explanationSnapshot: { note: "test" }, catalogSnapshot: { catalog: true } };
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-correlation-id": "response-correlation" } }); }
const command = { pricingProject: { id: "project-1" }, concurrencyToken: "opaque-next", idempotentReplay: false };

describe("PricingApiClient", () => {
  it("sends Company scope, correlation, credentials, search, filters, sorting, and pagination", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: { items: [], page: 2, pageSize: 20, total: 0, totalPages: 0 } }));
    await new PricingApiClient("company-1", fetcher).list({ page: 2, pageSize: 20, search: "Acme", status: "DRAFT", pricingModel: "PROJECT", sortBy: "projectName", sortDirection: "asc" });
    const [url, init] = fetcher.mock.calls[0]; const query = new URL(String(url), "http://local").searchParams;
    expect(Object.fromEntries(query)).toMatchObject({ page: "2", search: "Acme", status: "DRAFT", pricingModel: "PROJECT", sortBy: "projectName", sortDirection: "asc" });
    expect(init?.credentials).toBe("same-origin"); expect(new Headers(init?.headers).get("x-company-id")).toBe("company-1"); expect(new Headers(init?.headers).get("x-correlation-id")).toMatch(/[0-9a-f-]{36}/);
  });
  it("uses every authoritative read route", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response({ data: [] })); const api = new PricingApiClient("company-1", fetcher); const id = "project/1";
    await api.detail(id); await api.edit(id); await api.versions(id); await api.reviews(id);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/api/pricing-projects/project%2F1", "/api/pricing-projects/project%2F1/edit", "/api/pricing-projects/project%2F1/versions", "/api/pricing-projects/project%2F1/reviews"]);
  });
  it("creates with the complete Draft and command transport headers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: command })); const result = await new PricingApiClient("company-1", fetcher).create({ clientId: "client-1", ownerId: "owner-1", draft });
    const [, init] = fetcher.mock.calls[0]; expect(init?.method).toBe("POST"); expect(JSON.parse(String(init?.body))).toEqual({ clientId: "client-1", ownerId: "owner-1", draft }); expect(new Headers(init?.headers).get("idempotency-key")).toMatch(/[0-9a-f-]{36}/); expect(result.concurrencyToken).toBe("opaque-next");
  });
  it("submits a complete Draft and opaque token without interpreting either", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: command })); await new PricingApiClient("company-1", fetcher).updateDraft("project-1", draft, "opaque-current");
    expect(fetcher.mock.calls[0][1]?.method).toBe("PATCH"); expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ draft, concurrencyToken: "opaque-current" });
  });
  it("wires every governance command to its exact route and payload", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response({ data: command })); const api = new PricingApiClient("company-1", fetcher); const id = "project-1";
    await api.saveVersion(id, "t1"); await api.requestQualityReview(id, "t2", 3); await api.approve(id, "t3"); await api.reject(id, "t4", "Finding"); await api.beginRevision(id, "t5"); await api.archive(id, "t6");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["versions", "quality-review", "approve", "reject", "revision", "archive"].map((path) => `/api/pricing-projects/${id}/${path}`));
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ concurrencyToken: "t2", versionNumber: 3 }); expect(JSON.parse(String(fetcher.mock.calls[3][1]?.body))).toEqual({ concurrencyToken: "t4", finding: "Finding" });
  });
  it.each([[400, "INVALID_REQUEST"], [401, "NOT_AUTHENTICATED"], [403, "CAPABILITY_DENIED"], [404, "PRICING_PROJECT_NOT_FOUND"], [409, "OPTIMISTIC_CONCURRENCY_CONFLICT"], [500, "TRANSACTION_FAILURE"]])("exposes typed stable API errors for HTTP %s", async (status, code) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { code, message: "Safe message" }, correlationId: "api-correlation" }, status as number)); const error = await new PricingApiClient("company-1", fetcher).list().catch((caught) => caught);
    expect(error).toBeInstanceOf(PricingApiError); expect(error).toMatchObject({ code, status, correlationId: "api-correlation", message: "Safe message" });
  });
  it("identifies only the authoritative optimistic concurrency error as a conflict", () => {
    expect(new PricingApiError("OPTIMISTIC_CONCURRENCY_CONFLICT", "Conflict", 409, "id").isConcurrencyConflict).toBe(true); expect(new PricingApiError("DOMAIN_RULE_VIOLATION", "Rule", 409, "id").isConcurrencyConflict).toBe(false);
  });
  it("returns a safe client error for network and unreadable responses", async () => {
    const network = await new PricingApiClient("company-1", vi.fn<typeof fetch>().mockRejectedValue(new Error("private"))).list().catch((caught) => caught); expect(network).toMatchObject({ code: "NETWORK_ERROR", status: 0 });
    const invalid = await new PricingApiClient("company-1", vi.fn<typeof fetch>().mockResolvedValue(new Response("not json", { status: 500 }))).list().catch((caught) => caught); expect(invalid).toMatchObject({ code: "INVALID_RESPONSE", status: 500 });
  });
});
