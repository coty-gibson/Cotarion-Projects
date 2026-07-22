import { describe, expect, it, vi } from "vitest";
import { ProposalApplicationError } from "@/application/proposals/proposal-application-errors";
import type { ProposalApplicationService } from "@/application/proposals/proposal-application-service";
import type { ProposalQueryService } from "@/application/proposals/proposal-query-service";
import type { ProposalAggregate } from "@/domain/proposals/proposal-domain";
import { encodeProposalConcurrencyToken } from "@/application/proposals/proposal-concurrency-token";
import {
  handleProposalCollection,
  handleProposalResource,
  type ProposalHttpDependencies
} from "@/interfaces/http/proposals/proposal-http-adapter";

const companyId = "company-1";
const proposalId = "550e8400-e29b-41d4-a716-446655440000";
const requestId = "11111111-1111-4111-8111-111111111111";
const correlationId = "22222222-2222-4222-8222-222222222222";

const state = {
  id: proposalId,
  proposalNumber: "PRO-000001",
  companyId,
  clientId: "client-1",
  ownerId: "owner-1",
  workingDraft: { title: "API Proposal" },
  status: "DRAFT",
  currentVersionId: null,
  submittedVersionId: null,
  supersedesProposalId: null,
  supersededByProposalId: null,
  executedAgreementId: null,
  createdAt: "2026-07-21T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
  effectiveAt: null,
  closedAt: null,
  versions: []
};
const aggregate = { state, proposalVersionStatus: () => "SAVED" } as unknown as ProposalAggregate;
const result = { aggregate, revision: 1, idempotentReplay: false };

function dependencies(options?: { authenticated?: boolean; applicationError?: ProposalApplicationError }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const application = new Proxy({}, {
    get(_target, property) {
      return async (...args: unknown[]) => {
        calls.push({ method: String(property), args });
        if (options?.applicationError) throw options.applicationError;
        return result;
      };
    }
  }) as ProposalApplicationService;
  const queries = {
    async load(...args: unknown[]) {
      calls.push({ method: "load", args });
      if (options?.applicationError) throw options.applicationError;
      return { ...state, title: state.workingDraft.title, versionCount: 0 };
    },
    async list(...args: unknown[]) {
      calls.push({ method: "list", args });
      if (options?.applicationError) throw options.applicationError;
      return { items: [{ ...state, versionCount: 0 }], nextCursor: null };
    },
    async edit(...args: unknown[]) { calls.push({ method: "edit", args }); return { id: proposalId }; },
    async workflow(...args: unknown[]) { calls.push({ method: "workflow", args }); return { id: proposalId }; },
    async history(...args: unknown[]) { calls.push({ method: "history", args }); return { id: proposalId }; }
  } as unknown as ProposalQueryService;
  const logs: Record<string, unknown>[] = [];
  const deps: ProposalHttpDependencies = {
    authenticate: async () => options?.authenticated === false ? null : ({ id: "auth-1", email: "user@example.com" }),
    services: {
      application,
      queries,
      representations: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: String(property), args }); return { record: { id: "representation-1" }, idempotentReplay: false }; } }) as never,
      representationQueries: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: `representation.${String(property)}`, args }); return property === "content" ? { content: new Uint8Array([37, 80, 68, 70]), contentType: "application/pdf", type: "PDF" } : property === "list" || property === "history" ? [] : { id: "representation-1" }; } }) as never
      ,deliveries: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: `delivery.${String(property)}`, args }); return property === "create" ? { delivery: { id: "delivery-1" }, secureToken: "a".repeat(43), idempotentReplay: false } : { id: "delivery-1", status: "REVOKED" }; } }) as never,
      deliveryQueries: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: `deliveryQuery.${String(property)}`, args }); return property === "detail" ? { id: "delivery-1" } : []; } }) as never,
      decisionQueries: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: `decisionQuery.${String(property)}`, args }); return property === "current" ? { outcome: "ACCEPTED" } : []; } }) as never
      ,agreements: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: `agreement.${String(property)}`, args }); return { agreement: { id: "agreement-1" }, idempotentReplay: false }; } }) as never,
      agreementQueries: new Proxy({}, { get: (_target, property) => async (...args: unknown[]) => { calls.push({ method: `agreementQuery.${String(property)}`, args }); return property === "list" ? { items: [], permittedActions: { generate: true } } : property === "artifact" ? { content: new Uint8Array([37,80,68,70]), contentType: "application/pdf", agreementNumber: "AGR-1" } : { id: "agreement-1" }; } }) as never
    },
    now: () => new Date("2026-07-21T12:00:00.000Z"),
    randomUUID: vi.fn().mockReturnValueOnce(correlationId).mockReturnValue(requestId),
    log: (entry) => logs.push({ ...entry })
  };
  return { deps, calls, logs };
}

function request(path: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  return new Request(`http://localhost${path}`, {
    method: options?.method ?? "GET",
    headers: { "x-company-id": companyId, ...(options?.headers ?? {}), ...(options?.body === undefined ? {} : { "content-type": "application/json" }) },
    body: options?.body === undefined ? undefined : JSON.stringify({
      ...(options.body as Record<string, unknown>),
      concurrencyToken: encodeProposalConcurrencyToken(1)
    })
  });
}

describe("Proposal HTTP adapter", () => {
  it("loads and lists serialization-safe read models with pagination and filters", async () => {
    const loaded = dependencies();
    expect((await handleProposalResource(request(`/api/proposals/${proposalId}`), [proposalId], loaded.deps)).status).toBe(200);
    const listed = await handleProposalCollection(request("/api/proposals?limit=25&status=DRAFT&clientId=client-1&ownerId=owner-1"), loaded.deps);
    expect(listed.status).toBe(200);
    expect(loaded.calls.map(({ method }) => method)).toEqual(["load", "list"]);
    expect(await listed.json()).toMatchObject({ data: { items: [{ id: proposalId }] } });
    const projections = dependencies();
    for (const suffix of ["edit", "workflow", "history"] as const) {
      expect((await handleProposalResource(request(`/api/proposals/${proposalId}/${suffix}`), [proposalId, suffix], projections.deps)).status).toBe(200);
    }
    expect(projections.calls.map(({ method }) => method)).toEqual(["edit", "workflow", "history"]);
  });

  it("routes every command to the application service without business decisions", async () => {
    const cases: { path: string[]; method?: string; body?: Record<string, unknown>; expected: string }[] = [
      { path: [proposalId, "draft"], method: "PATCH", body: { title: "Updated" }, expected: "updateDraft" },
      { path: [proposalId, "versions"], body: {}, expected: "saveProposalVersion" },
      { path: [proposalId, "pricing-version"], body: { pricingProjectId: "pricing-1", pricingVersionId: "pricing-version-1" }, expected: "attachPricingVersion" },
      { path: [proposalId, "quality-review"], body: {}, expected: "requestQualityReview" },
      { path: [proposalId, "executive-authorization"], body: {}, expected: "submitForExecutiveAuthorization" },
      { path: [proposalId, "approve"], body: {}, expected: "approveProposal" },
      { path: [proposalId, "reject"], body: {}, expected: "rejectProposal" },
      { path: [proposalId, "request-changes"], body: {}, expected: "requestChanges" },
      { path: [proposalId, "submit", "quality-review"], body: {}, expected: "submitThroughQualityReview" },
      { path: [proposalId, "submit", "executive-authorization"], body: { businessJustification: "Approved alternate path." }, expected: "submitThroughExecutiveAuthorization" },
      { path: [proposalId, "viewed"], body: {}, expected: "recordProposalViewed" },
      { path: [proposalId, "acceptances", "client"], body: { recipientId: "recipient-1" }, expected: "recordClientAcceptance" },
      { path: [proposalId, "acceptances", "verbal"], body: { recipientId: "recipient-1", reason: "Phone", notes: "Recorded" }, expected: "recordVerbalAcceptance" },
      { path: [proposalId, "acceptances", "withdraw"], body: { reason: "Corrected" }, expected: "withdrawAcceptance" },
      { path: [proposalId, "agreement"], body: { agreementId: "agreement-1" }, expected: "linkExecutedAgreement" },
      { path: [proposalId, "decline"], body: {}, expected: "declineProposal" },
      { path: [proposalId, "expire"], body: {}, expected: "expireProposal" },
      { path: [proposalId, "replacements"], body: { title: "Replacement" }, expected: "createReplacementProposal" },
      { path: [proposalId, "supersede"], body: { replacementProposalId: "550e8400-e29b-41d4-a716-446655440001" }, expected: "supersedeOriginalProposal" },
      { path: [proposalId, "archive"], body: {}, expected: "archiveProposal" }
    ];
    for (const item of cases) {
      const current = dependencies();
      const response = await handleProposalResource(
        request(`/api/proposals/${item.path.join("/")}`, { method: item.method ?? "POST", body: item.body }),
        item.path,
        current.deps
      );
      expect(response.status, item.expected).toBe(200);
      expect(current.calls[0].method).toBe(item.expected);
      expect(current.calls[1].method).toBe("load");
    }
  });

  it("exposes stable generation, direct-read, current, history, detail, and download contracts", async () => {
    const current = dependencies();
    const generated = await handleProposalResource(
      request(`/api/proposals/${proposalId}/versions/version-1/representations`, { method: "POST", body: { representationType: "PDF" } }),
      [proposalId, "versions", "version-1", "representations"],
      current.deps
    );
    expect(generated.status).toBe(201);
    expect(await generated.json()).toMatchObject({ data: { representation: { id: "representation-1" }, idempotentReplay: false } });

    for (const path of [
      [proposalId, "representations"],
      [proposalId, "representations", "history"],
      [proposalId, "representations", "current"],
      [proposalId, "representations", "representation-1"]
    ]) {
      const suffix = path.at(-1) === "current" ? "?type=HTML" : "";
      expect((await handleProposalResource(request(`/api/proposals/${path.join("/")}${suffix}`), path, current.deps)).status).toBe(200);
    }
    const download = await handleProposalResource(
      request(`/api/proposals/${proposalId}/representations/representation-1/download`),
      [proposalId, "representations", "representation-1", "download"],
      current.deps
    );
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await download.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("creates Proposals and returns the public command response", async () => {
    const current = dependencies();
    const response = await handleProposalCollection(request("/api/proposals", {
      method: "POST",
      body: {
        clientId: "client-1",
        title: "New Proposal",
        engagementTypeCode: "PROJECT",
        pricingProjectId: "pricing-1",
        pricingVersionId: "pricing-version-1"
      }
    }), current.deps);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.proposal).toMatchObject({ id: proposalId, proposalNumber: "PRO-000001" });
    expect(body.data.proposal.events).toBeUndefined();
    expect(current.calls[0].method).toBe("createProposal");
    expect(current.calls[1].method).toBe("load");
  });

  it("returns the authoritative refreshed workspace projection after a command", async () => {
    const current = dependencies();
    const response = await handleProposalResource(
      request(`/api/proposals/${proposalId}/archive`, { method: "POST", body: {} }),
      [proposalId, "archive"],
      current.deps
    );
    const body = await response.json();
    expect(body.data).toMatchObject({
      proposal: { id: proposalId, title: "API Proposal", versionCount: 0 },
      idempotentReplay: false
    });
    expect(body.data).not.toHaveProperty("revision");
    expect(current.calls.map(({ method }) => method)).toEqual(["archiveProposal", "load"]);
  });

  it("rejects unauthenticated and cross-Company requests", async () => {
    expect((await handleProposalCollection(request("/api/proposals"), dependencies({ authenticated: false }).deps)).status).toBe(401);
    const crossCompany = new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "Wrong Company.");
    expect((await handleProposalCollection(request("/api/proposals"), dependencies({ applicationError: crossCompany }).deps)).status).toBe(403);
  });

  it("rejects malformed bodies, identifiers, pagination, filters, UUID headers, and oversized bodies", async () => {
    const malformed = new Request("http://localhost/api/proposals", { method: "POST", headers: { "x-company-id": companyId }, body: "{" });
    expect((await handleProposalCollection(malformed, dependencies().deps)).status).toBe(400);
    expect((await handleProposalResource(request("/api/proposals/bad/id", { method: "POST", body: {} }), ["bad/id", "archive"], dependencies().deps)).status).toBe(400);
    expect((await handleProposalCollection(request("/api/proposals?limit=abc"), dependencies().deps)).status).toBe(400);
    expect((await handleProposalCollection(request("/api/proposals?status=UNKNOWN"), dependencies().deps)).status).toBe(400);
    expect((await handleProposalCollection(request("/api/proposals", { headers: { "idempotency-key": "not-a-uuid" } }), dependencies().deps)).status).toBe(400);
    const oversized = new Request("http://localhost/api/proposals", { method: "POST", headers: { "x-company-id": companyId, "content-length": "1048577" }, body: "{}" });
    expect((await handleProposalCollection(oversized, dependencies().deps)).status).toBe(400);
  });

  it.each([
    ["NOT_AUTHENTICATED", 401], ["CAPABILITY_DENIED", 403], ["PROPOSAL_NOT_FOUND", 404], ["INVALID_REQUEST", 400],
    ["DOMAIN_RULE_VIOLATION", 409], ["OPTIMISTIC_CONCURRENCY_CONFLICT", 409], ["IMMUTABLE_PERSISTENCE_CONFLICT", 409],
    ["AUTHORITY_CONFIGURATION_MISSING", 409], ["AUTHORITY_CONFLICT", 409], ["TRANSACTION_FAILURE", 500]
  ] as const)("maps %s without exposing internals", async (code, status) => {
    const error = new ProposalApplicationError(code, "safe message", new Error("secret SQL"));
    const response = await handleProposalCollection(request("/api/proposals"), dependencies({ applicationError: error }).deps);
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("secret SQL");
    expect(JSON.stringify(body)).not.toContain("stack");
  });

  it("honors Request Identity and emits correlation and timing metadata", async () => {
    const current = dependencies();
    const response = await handleProposalResource(request(`/api/proposals/${proposalId}/archive`, {
      method: "POST", body: {}, headers: { "idempotency-key": requestId, "x-correlation-id": correlationId }
    }), [proposalId, "archive"], current.deps);
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(response.headers.get("x-correlation-id")).toBe(correlationId);
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=/);
    expect((current.calls[0].args[0] as { requestId: string }).requestId).toBe(requestId);
    expect(current.logs[0]).toMatchObject({ requestId, correlationId, status: 200 });
  });

  it("exposes stable internal Decision history and current projections", async () => {
    const current = dependencies();
    expect((await handleProposalResource(request(`/api/proposals/${proposalId}/decisions`), [proposalId, "decisions"], current.deps)).status).toBe(200);
    expect((await handleProposalResource(request(`/api/proposals/${proposalId}/decisions/current`), [proposalId, "decisions", "current"], current.deps)).status).toBe(200);
    expect(current.calls.map(({ method }) => method)).toEqual(["decisionQuery.history", "decisionQuery.current"]);
  });

  it("generates and reads Agreements through stable Proposal-scoped endpoints", async () => {
    const current = dependencies();
    expect((await handleProposalResource(request(`/api/proposals/${proposalId}/agreements`, { method: "POST", body: {} }), [proposalId, "agreements"], current.deps)).status).toBe(201);
    expect((await handleProposalResource(request(`/api/proposals/${proposalId}/agreements`), [proposalId, "agreements"], current.deps)).status).toBe(200);
    expect((await handleProposalResource(request(`/api/proposals/${proposalId}/agreements/agreement-1`), [proposalId, "agreements", "agreement-1"], current.deps)).status).toBe(200);
    expect(current.calls.map(({ method }) => method)).toEqual(["agreement.generate", "agreementQuery.list", "agreementQuery.detail"]);
  });
});
