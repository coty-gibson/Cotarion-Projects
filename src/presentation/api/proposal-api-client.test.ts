import { describe, expect, it, vi } from "vitest";
import { ProposalApiClient, WorkspaceApiError } from "./proposal-api-client";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-correlation-id": "response-correlation" }
  });
}

describe("ProposalApiClient", () => {
  it("sends Company scope, correlation, credentials, and list filters", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: { items: [], nextCursor: null } }));
    const client = new ProposalApiClient("company-1", fetcher);

    await client.list({ limit: 10, cursor: "next", status: "DRAFT", clientId: "client-1", ownerId: "owner-1" });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain("limit=10");
    expect(String(url)).toContain("status=DRAFT");
    expect(String(url)).toContain("clientId=client-1");
    expect(init?.credentials).toBe("same-origin");
    expect(new Headers(init?.headers).get("x-company-id")).toBe("company-1");
    expect(new Headers(init?.headers).get("x-correlation-id")).toMatch(/[0-9a-f-]{36}/);
  });

  it("loads a Proposal through the read endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: { id: "proposal-1" } }));
    const result = await new ProposalApiClient("company-1", fetcher).load("proposal/1");
    expect(fetcher.mock.calls[0][0]).toBe("/api/proposals/proposal%2F1");
    expect(result.id).toBe("proposal-1");
  });

  it("creates from bounded transport identifiers without accepting domain policy or Pricing evidence", async () => {
    const proposal = { id: "proposal-1", concurrencyToken: "token-1" };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ data: { proposal, idempotentReplay: false } }));
    const client = new ProposalApiClient("company-1", fetcher);
    await client.create({
      clientId: "client-1",
      engagementTypeCode: "PROJECT",
      pricingProjectId: "pricing-1",
      pricingVersionId: "pricing-version-1",
      title: "Foundation Proposal"
    });
    expect(fetcher.mock.calls[0][0]).toBe("/api/proposals");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      clientId: "client-1",
      engagementTypeCode: "PROJECT",
      pricingProjectId: "pricing-1",
      pricingVersionId: "pricing-version-1",
      title: "Foundation Proposal"
    });
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("idempotency-key")).toMatch(/[0-9a-f-]{36}/);
  });

  it("uses typed Representation generation, history, detail, current, and content endpoints", async () => {
    const representation = { id: "representation-1", proposalId: "proposal-1", proposalVersionId: "version-1", proposalVersionNumber: 1, representationType: "HTML", representationVersion: 1, rendererVersion: "renderer/1", status: "GENERATED", contentChecksum: "checksum", contentType: "text/html", generatedAt: "2026-07-21T12:00:00.000Z", generatedByUserId: "member-1", metadata: {} };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).endsWith("/download")
      ? new Response("<html></html>", { headers: { "content-type": "text/html" } })
      : response({ data: String(url).includes("/versions/") ? { representation, idempotentReplay: false } : String(url).includes("current") || String(url).endsWith("representation-1") ? representation : [representation] }));
    const client = new ProposalApiClient("company-1", fetcher);
    await client.generateRepresentation("proposal-1", "version-1", "HTML");
    await client.listRepresentations("proposal-1", "version-1");
    await client.representationHistory("proposal-1");
    await client.currentRepresentation("proposal-1", "HTML");
    await client.representationDetail("proposal-1", "representation-1");
    expect(await (await client.representationContent("proposal-1", "representation-1")).text()).toBe("<html></html>");
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      "/api/proposals/proposal-1/versions/version-1/representations",
      "/api/proposals/proposal-1/representations?proposalVersionId=version-1",
      "/api/proposals/proposal-1/representations/history",
      "/api/proposals/proposal-1/representations/current?type=HTML",
      "/api/proposals/proposal-1/representations/representation-1",
      "/api/proposals/proposal-1/representations/representation-1/download"
    ]);
  });

  it("uses the actual Draft and Version endpoints with typed command envelopes", async () => {
    const command = { proposal: { id: "proposal-1", concurrencyToken: "token-2" }, revision: 4, idempotentReplay: false };
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => response({ data: init?.method === "GET" ? { id: "proposal-1", concurrencyToken: "token-1" } : command }));
    const client = new ProposalApiClient("company-1", fetcher);
    await client.load("proposal-1");
    fetcher.mockClear();

    expect((await client.updateDraft("proposal-1", { title: "Updated" })).proposal.id).toBe("proposal-1");
    await client.saveVersion("proposal-1", "Client feedback");

    expect(fetcher.mock.calls[0][0]).toBe("/api/proposals/proposal-1/draft");
    expect(fetcher.mock.calls[0][1]?.method).toBe("PATCH");
    expect(fetcher.mock.calls[0][1]?.body).toBe(JSON.stringify({ title: "Updated", concurrencyToken: "token-1" }));
    expect(fetcher.mock.calls[1][0]).toBe("/api/proposals/proposal-1/versions");
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get("idempotency-key")).toMatch(/[0-9a-f-]{36}/);
  });

  it("integrates every server-supported projected action endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => response({ data: init?.method === "GET" ? { id: "proposal-1", concurrencyToken: "token-1" } : { proposal: { concurrencyToken: "token-2" }, revision: 1, idempotentReplay: false } }));
    const client = new ProposalApiClient("company-1", fetcher); const id = "proposal-1";
    await client.load(id); fetcher.mockClear();
    await client.attachPricingVersion(id, "pricing-1", "pricing-version-1");
    await client.requestQualityReview(id); await client.requestChanges(id); await client.submitThroughQualityReview(id);
    await client.submitForExecutiveAuthorization(id); await client.approve(id); await client.reject(id);
    await client.submitThroughExecutiveAuthorization(id, "Business need"); await client.recordViewed(id);
    await client.recordClientAcceptance(id, { recipientId: "recipient-1" });
    await client.recordVerbalAcceptance(id, { recipientId: "recipient-1", reason: "Call", notes: "Confirmed" });
    await client.withdrawAcceptance(id, "Correction"); await client.linkExecutedAgreement(id, "agreement-1");
    await client.decline(id); await client.expire(id); await client.createReplacement(id, { title: "Replacement" });
    await client.supersede(id, "11111111-1111-4111-8111-111111111111"); await client.archive(id);
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      "pricing-version", "quality-review", "request-changes", "submit/quality-review", "executive-authorization", "approve", "reject", "submit/executive-authorization", "viewed",
      "acceptances/client", "acceptances/verbal", "acceptances/withdraw", "agreement", "decline", "expire",
      "replacements", "supersede", "archive"
    ].map((path) => `/api/proposals/${id}/${path}`));
  });

  it("retries a transient server failure once", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ error: { code: "TRANSACTION_FAILURE", message: "temporary" } }, 500))
      .mockResolvedValueOnce(response({ data: { items: [], nextCursor: null } }));
    await new ProposalApiClient("company-1", fetcher).list();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reuses one idempotency key when a command retry is required", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: { id: "proposal-1", concurrencyToken: "token-1" } }))
      .mockResolvedValueOnce(response({ error: { code: "TRANSACTION_FAILURE", message: "temporary" } }, 500))
      .mockResolvedValueOnce(response({ data: { proposal: { concurrencyToken: "token-2" }, revision: 2, idempotentReplay: true } }));
    const client = new ProposalApiClient("company-1", fetcher); await client.load("proposal-1");
    const result = await client.archive("proposal-1");
    const first = new Headers(fetcher.mock.calls[1][1]?.headers).get("idempotency-key");
    const second = new Headers(fetcher.mock.calls[2][1]?.headers).get("idempotency-key");
    expect(first).toBe(second); expect(result.idempotentReplay).toBe(true);
  });

  it("preserves safe API error details without exposing implementation errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { code: "CAPABILITY_DENIED", message: "Not permitted" }, correlationId: "api-correlation" }, 403));
    const error = await new ProposalApiClient("company-1", fetcher).list().catch((caught) => caught);
    expect(error).toBeInstanceOf(WorkspaceApiError);
    expect(error).toMatchObject({ code: "CAPABILITY_DENIED", status: 403, correlationId: "api-correlation", message: "Not permitted" });
  });

  it("returns a stable workspace error after repeated network failure", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("private transport detail"));
    const error = await new ProposalApiClient("company-1", fetcher).list().catch((caught) => caught);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(error).toMatchObject({ code: "NETWORK_ERROR", status: 0, message: "The workspace could not reach Cotarion services." });
  });
});
