import { describe, expect, it } from "vitest";
import { PricingApplicationError } from "@/application/pricing/pricing-application-errors";
import type { PricingQueryService } from "@/application/pricing/pricing-query-service";
import {
  handlePricingDetailQuery,
  handlePricingListQuery,
  type PricingQueryHttpDependencies
} from "@/interfaces/http/pricing/pricing-query-http-adapter";

const projectId = "550e8400-e29b-41d4-a716-446655440000";
const correlationId = "11111111-1111-4111-8111-111111111111";

function dependencies(options?: { authenticated?: boolean; notFound?: boolean; error?: PricingApplicationError }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const queries = new Proxy({}, { get(_target, property) {
    return async (...args: unknown[]) => {
      calls.push({ method: String(property), args });
      if (options?.error) throw options.error;
      if (options?.notFound) throw new PricingApplicationError("PRICING_PROJECT_NOT_FOUND", "Not found.");
      if (property === "list") return { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
      if (property === "versions" || property === "reviews") return [];
      if (property === "editableDraft") return {
        pricingProjectId: projectId,
        estimateNumber: "PP-000001",
        client: { id: "client-1", clientNumber: "CLI-000001", name: "Client" },
        owner: { id: "owner-1", name: "Owner", email: "owner@example.test" },
        draft: { inputSnapshot: {}, outputSnapshot: {}, explanationSnapshot: {}, catalogSnapshot: {} },
        concurrencyToken: "opaque-token",
        permittedActions: ["EDIT_DRAFT"]
      };
      return { summary: { id: projectId }, versionCount: 0, versions: [], reviews: [] };
    };
  }}) as PricingQueryService;
  const dependencies: PricingQueryHttpDependencies = {
    authenticate: async () => options?.authenticated === false ? null : { id: "auth-1", email: "user@example.test" },
    queries,
    randomUUID: () => correlationId
  };
  return { dependencies, calls };
}

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, { headers: { "x-company-id": "company-1", ...headers } });
}

describe("Pricing query HTTP adapter", () => {
  it("validates and forwards paging, search, filters, and sorting", async () => {
    const current = dependencies();
    const response = await handlePricingListQuery(request(
      "/api/pricing-projects?page=2&pageSize=10&search=alpha&status=QUOTED&pricingModel=PROJECT&sortBy=projectName&sortDirection=asc"
    ), current.dependencies);
    expect(response.status).toBe(200);
    expect(current.calls[0].method).toBe("list");
    expect(current.calls[0].args[2]).toEqual({
      page: 2, pageSize: 10, search: "alpha", status: "QUOTED", pricingModel: "PROJECT",
      sortBy: "projectName", sortDirection: "asc"
    });
    expect(await response.json()).toMatchObject({ data: { items: [], total: 0 } });
  });

  it("routes detail, Version history, and review history independently", async () => {
    for (const [suffix, method] of [["", "detail"], ["/edit", "editableDraft"], ["/versions", "versions"], ["/reviews", "reviews"]] as const) {
      const current = dependencies();
      const path = [projectId, ...suffix.split("/").filter(Boolean)];
      const response = await handlePricingDetailQuery(request(`/api/pricing-projects/${projectId}${suffix}`), path, current.dependencies);
      expect(response.status).toBe(200);
      expect(current.calls[0].method).toBe(method);
      if (method === "editableDraft") {
        const body = await response.json();
        expect(body.data.draft).toMatchObject({ inputSnapshot: {}, outputSnapshot: {}, explanationSnapshot: {}, catalogSnapshot: {} });
        expect(body.data.concurrencyToken).toBe("opaque-token");
        expect(body.data).not.toHaveProperty("revision");
        expect(body.data).not.toHaveProperty("aggregateRevision");
      }
    }
  });

  it("returns 401 for missing authentication and 404 for unknown Projects", async () => {
    expect((await handlePricingListQuery(request("/api/pricing-projects"), dependencies({ authenticated: false }).dependencies)).status).toBe(401);
    expect((await handlePricingDetailQuery(request(`/api/pricing-projects/${projectId}`), [projectId], dependencies({ notFound: true }).dependencies)).status).toBe(404);
    expect((await handlePricingDetailQuery(
      request(`/api/pricing-projects/${projectId}/edit`), [projectId, "edit"],
      dependencies({ error: new PricingApplicationError("COMPANY_SCOPE_VIOLATION", "Wrong Company.") }).dependencies
    )).status).toBe(403);
    expect((await handlePricingDetailQuery(
      request(`/api/pricing-projects/${projectId}/edit`), [projectId, "edit"],
      dependencies({ notFound: true }).dependencies
    )).status).toBe(404);
  });

  it("rejects invalid paging, filters, sorting, IDs, and unknown resources", async () => {
    for (const path of [
      "/api/pricing-projects?page=0",
      "/api/pricing-projects?pageSize=101",
      "/api/pricing-projects?status=UNKNOWN",
      "/api/pricing-projects?pricingModel=UNKNOWN",
      "/api/pricing-projects?sortBy=unknown",
      "/api/pricing-projects?sortDirection=sideways"
    ]) expect((await handlePricingListQuery(request(path), dependencies().dependencies)).status).toBe(400);
    expect((await handlePricingDetailQuery(request("/api/pricing-projects/bad"), ["bad"], dependencies().dependencies)).status).toBe(400);
    expect((await handlePricingDetailQuery(request(`/api/pricing-projects/${projectId}/unknown`), [projectId, "unknown"], dependencies().dependencies)).status).toBe(400);
  });
});
