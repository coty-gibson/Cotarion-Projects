/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { PROPOSAL_CAPABILITIES } from "@/application/proposals/proposal-capabilities";
import { HmacSignatureProvider } from "@/infrastructure/agreements/hmac-signature-provider";
import { SignatureService } from "./signature-service";

const identity = { id: "auth", email: "user@example.com", name: "User" };

describe("SignatureService", () => {
  it("creates governed CLIENT and representative requests transactionally through the repository", async () => {
    const createRequests = vi.fn(async (input: any) => ({ items: input.requests.map((request: any) => ({ id: request.id, agreementId: "agreement-1", agreementVersion: 1, agreementNumber: "AGR-1", signer: { displayName: request.displayName, email: request.email, role: request.role, order: request.signingOrder }, signingMode: request.signingMode, status: "AVAILABLE", requestedAt: input.requestedAt, expiresAt: input.expiresAt, revokedAt: null, signedAt: null, declinedAt: null, typedSignerName: null, signerMessage: null, artifactChecksum: "checksum", permittedActions: { revoke: true }, events: [], accesses: [] })), replay: false }));
    const service = new SignatureService({ load: async () => ({ userId: "user-1", companyId: "company-1", active: true }) }, { capabilitiesFor: async () => new Set([PROPOSAL_CAPABILITIES.CREATE_SIGNATURE_REQUEST]) }, { createRequests } as never, new HmacSignatureProvider("a-signature-secret-longer-than-thirty-two-bytes"), () => "1");
    const result = await service.create(identity, "company-1", { agreementId: "agreement-1", signingMode: "PARALLEL", requestedAt: "2026-01-01T00:00:00Z", expiresAt: "2026-01-02T00:00:00Z", requestIdentity: "request", correlationId: "correlation", signers: [{ displayName: "Client", email: "CLIENT@example.com", role: "CLIENT", order: 1 }, { displayName: "Rep", email: "rep@example.com", role: "COTARION_REPRESENTATIVE", order: 1 }] });
    expect(result.items.map(item => item.signer.role)).toEqual(["CLIENT", "COTARION_REPRESENTATIVE"]);
    const persisted = createRequests.mock.calls[0][0];
    expect(JSON.stringify(persisted)).not.toContain(result.items[0].secureUrl);
    expect(persisted.requests[0].tokenDigest).toHaveLength(64);
  });

  it("enforces capability and Company isolation", async () => {
    const service = new SignatureService({ load: async () => ({ userId: "u", companyId: "company-1", active: true }) }, { capabilitiesFor: async () => new Set() }, {} as never, new HmacSignatureProvider("a-signature-secret-longer-than-thirty-two-bytes"));
    const input = { agreementId: "a", signingMode: "PARALLEL" as const, requestedAt: "2026-01-01", expiresAt: "2026-01-02", requestIdentity: "r", correlationId: "c", signers: [] };
    await expect(service.create(identity, "company-1", input)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
    await expect(service.create(identity, "company-2", input)).rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" });
  });
});
