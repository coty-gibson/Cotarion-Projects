import { describe, expect, it } from "vitest";
import { handleExecutionHttp } from "./execution-http";
const identity = { id: "auth", email: "user@example.com", name: "User" };
const execution = { id: "execution-1", agreementId: "agreement-1", executed: true };
const dependencies = { authenticate: async () => identity, services: { executions: { execute: async () => ({ execution, replay: false }) }, executionQueries: { detail: async () => ({ execution, permittedActions: { execute: false } }), list: async () => [execution] } }, now: () => new Date("2026-07-21T12:00:00.000Z"), uuid: () => "request-1" };
describe("Agreement execution HTTP", () => {
  it("creates execution through the internal command endpoint", async () => { const response = await handleExecutionHttp(new Request("http://local/api/agreements/agreement-1/execute", { method: "POST", headers: { "x-company-id": "company-1", "idempotency-key": "request-1" } }), ["agreement-1", "execute"], dependencies as never); expect(response.status).toBe(201); expect(await response.json()).toEqual({ data: { execution, replay: false } }); });
  it("exposes internal execution detail and history", async () => { const detail = await handleExecutionHttp(new Request("http://local", { headers: { "x-company-id": "company-1" } }), ["agreement-1", "execution"], dependencies as never); const history = await handleExecutionHttp(new Request("http://local", { headers: { "x-company-id": "company-1" } }), ["agreement-1", "executions"], dependencies as never); expect(detail.status).toBe(200); expect(history.status).toBe(200); });
  it("rejects unauthenticated execution", async () => { const response = await handleExecutionHttp(new Request("http://local", { method: "POST", headers: { "x-company-id": "company-1" } }), ["agreement-1", "execute"], { ...dependencies, authenticate: async () => null } as never); expect(response.status).toBe(401); });
});
