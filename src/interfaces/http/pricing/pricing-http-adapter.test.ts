import { describe, expect, it } from "vitest";
import { PricingApplicationError, type PricingApplicationErrorCode } from "@/application/pricing/pricing-application-errors";
import type { PricingApplicationService } from "@/application/pricing/pricing-application-service";
import type { PricingProject } from "@/domain/pricing";
import { encodePricingConcurrencyToken } from "@/application/pricing/pricing-concurrency-token";
import {
  handlePricingCollection,
  handlePricingResource,
  type PricingHttpDependencies
} from "@/interfaces/http/pricing/pricing-http-adapter";

const companyId = "company-1";
const projectId = "550e8400-e29b-41d4-a716-446655440000";
const requestId = "11111111-1111-4111-8111-111111111111";
const concurrencyToken = encodePricingConcurrencyToken(1);

const draft = {
  projectName: "HTTP Pricing",
  pricingModel: "PROJECT",
  currency: "USD",
  pricingConfigurationVersionId: "configuration-1",
  pricingConfigurationVersion: 1,
  configurationSchemaVersion: 1,
  engineVersion: "pricing-engine/2.0.0",
  methodologyVersion: "project-pricing/1.0.0",
  inputSnapshot: {},
  outputSnapshot: {},
  explanationSnapshot: {},
  catalogSnapshot: {}
};

const aggregate = {
  id: { value: projectId },
  companyId: { value: companyId },
  clientId: { value: "client-1" },
  ownerId: { value: "owner-1" },
  estimateNumber: "PP-000001",
  draft,
  status: "DRAFT",
  draftCurrency: { revision: 1 },
  versions: [],
  reviewCandidate: null,
  approvedVersion: null
} as unknown as PricingProject;

function dependencies(options?: { authenticated?: boolean; error?: PricingApplicationError; revision?: number }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const application = new Proxy({}, {
    get(_target, property) {
      return async (...args: unknown[]) => {
        calls.push({ method: String(property), args });
        if (options?.error) throw options.error;
        return { aggregate, revision: options?.revision ?? 1, idempotentReplay: false, events: [] };
      };
    }
  }) as PricingApplicationService;
  const dependencies: PricingHttpDependencies = {
    authenticate: async () => options?.authenticated === false ? null : { id: "auth-1", email: "user@example.test" },
    application,
    now: () => new Date("2026-07-21T12:00:00.000Z"),
    randomUUID: () => requestId,
    log: () => undefined
  };
  return { dependencies, calls };
}

function request(path: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  return new Request(`http://localhost${path}`, {
    method: options?.method ?? "POST",
    headers: {
      "x-company-id": companyId,
      "idempotency-key": requestId,
      ...(options?.headers ?? {}),
      ...(options?.body === undefined ? {} : { "content-type": "application/json" })
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body)
  });
}

describe("Pricing HTTP adapter", () => {
  it("creates a Pricing Project and returns only the stable command DTO", async () => {
    const current = dependencies();
    const response = await handlePricingCollection(request("/api/pricing-projects", {
      body: { clientId: "client-1", ownerId: "owner-1", draft }
    }), current.dependencies);
    expect(response.status).toBe(201);
    expect(current.calls[0]).toMatchObject({ method: "createPricingProject" });
    const body = await response.json();
    expect(body.data).toEqual({
      pricingProject: {
        id: projectId,
        estimateNumber: "PP-000001",
        companyId,
        clientId: "client-1",
        ownerId: "owner-1",
        projectName: "HTTP Pricing",
        pricingModel: "PROJECT",
        currency: "USD",
        status: "DRAFT",
        draftCurrency: 1,
        versionCount: 0,
        latestVersionNumber: null,
        reviewCandidate: null,
        approvedVersion: null
      },
      concurrencyToken,
      idempotentReplay: false
    });
    expect(JSON.stringify(body)).not.toContain("persistenceState");
    expect(JSON.stringify(body)).not.toContain("processedCommands");
  });

  it("routes every command directly to the Pricing application service", async () => {
    const cases = [
      { command: "draft", method: "PATCH", body: { concurrencyToken, draft }, expected: "updateDraft" },
      { command: "versions", body: { concurrencyToken }, expected: "saveVersion" },
      { command: "quality-review", body: { concurrencyToken, versionNumber: 1 }, expected: "requestQualityReview" },
      { command: "approve", body: { concurrencyToken }, expected: "approveVersion" },
      { command: "reject", body: { concurrencyToken, finding: "Correct the scope." }, expected: "rejectVersion" },
      { command: "revision", body: { concurrencyToken }, expected: "beginRevision" },
      { command: "archive", body: { concurrencyToken }, expected: "archiveProject" }
    ];
    for (const item of cases) {
      const current = dependencies({ revision: 2 });
      const response = await handlePricingResource(
        request(`/api/pricing-projects/${projectId}/${item.command}`, { method: item.method, body: item.body }),
        [projectId, item.command],
        current.dependencies
      );
      expect(response.status, item.command).toBe(200);
      expect(current.calls).toHaveLength(1);
      expect(current.calls[0].method).toBe(item.expected);
      expect((current.calls[0].args[0] as { expectedRevision: number }).expectedRevision).toBe(1);
      expect((await response.json()).data.concurrencyToken).toBe(encodePricingConcurrencyToken(2));
    }
  });

  it("rejects unauthenticated requests and maps authorization failures", async () => {
    expect((await handlePricingCollection(request("/api/pricing-projects", { body: { clientId: "client-1", draft } }), dependencies({ authenticated: false }).dependencies)).status).toBe(401);
    for (const code of ["COMPANY_SCOPE_VIOLATION", "CAPABILITY_DENIED"] as const) {
      const response = await handlePricingCollection(
        request("/api/pricing-projects", { body: { clientId: "client-1", draft } }),
        dependencies({ error: new PricingApplicationError(code, "Denied.") }).dependencies
      );
      expect(response.status).toBe(403);
    }
  });

  it("rejects malformed routes, payloads, revisions, findings, and request headers", async () => {
    const current = dependencies();
    expect((await handlePricingResource(request("/api/pricing-projects/not-an-id/archive", { body: { concurrencyToken } }), ["not-an-id", "archive"], current.dependencies)).status).toBe(400);
    expect((await handlePricingResource(request(`/api/pricing-projects/${projectId}/versions`, { body: { concurrencyToken: "malformed" } }), [projectId, "versions"], current.dependencies)).status).toBe(400);
    expect((await handlePricingResource(request(`/api/pricing-projects/${projectId}/versions`, { body: { expectedRevision: 1 } }), [projectId, "versions"], current.dependencies)).status).toBe(400);
    expect((await handlePricingResource(request(`/api/pricing-projects/${projectId}/reject`, { body: { concurrencyToken, finding: "" } }), [projectId, "reject"], current.dependencies)).status).toBe(400);
    expect((await handlePricingCollection(request("/api/pricing-projects", { body: { clientId: "client-1", draft: { ...draft, pricingModel: "UNKNOWN" } } }), current.dependencies)).status).toBe(400);
    expect((await handlePricingCollection(request("/api/pricing-projects", { body: { clientId: "client-1", draft }, headers: { "idempotency-key": "invalid" } }), current.dependencies)).status).toBe(400);
    const malformed = new Request("http://localhost/api/pricing-projects", { method: "POST", headers: { "x-company-id": companyId }, body: "{" });
    expect((await handlePricingCollection(malformed, current.dependencies)).status).toBe(400);
    expect(current.calls).toHaveLength(0);
  });

  it.each([
    ["PRICING_PROJECT_NOT_FOUND", 404],
    ["DOMAIN_RULE_VIOLATION", 409],
    ["OPTIMISTIC_CONCURRENCY_CONFLICT", 409],
    ["INVALID_REQUEST", 400],
    ["TRANSACTION_FAILURE", 500]
  ] as const)("maps %s application failures to HTTP %s without leaking causes", async (code, status) => {
    const error = new PricingApplicationError(code as PricingApplicationErrorCode, "Safe message.", new Error("secret database detail"));
    const response = await handlePricingResource(
      request(`/api/pricing-projects/${projectId}/archive`, { body: { concurrencyToken } }),
      [projectId, "archive"],
      dependencies({ error }).dependencies
    );
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("secret database detail");
    expect(body.error.code).toBe(code);
  });
});
