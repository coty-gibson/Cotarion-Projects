/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { HmacSignatureProvider } from "@/infrastructure/agreements/hmac-signature-provider";
import { SignaturePublicService } from "./signature-public-service";

const provider = new HmacSignatureProvider("a-signature-secret-longer-than-thirty-two-bytes");
const issued = provider.issue("company-1", "request-1");

describe("SignaturePublicService", () => {
  it("requires typed acknowledgment and preserves terminal replay/conflict semantics", async () => {
    let evidence: any = null;
    const repository = {
      publicView: async () => null,
      complete: async (input: any) => {
        if (evidence) return evidence.requestIdentity === input.requestIdentity && evidence.typedName === input.typedName && evidence.outcome === input.outcome ? { status: "REPLAY" } : { status: "CONFLICT" };
        evidence = input;
        return { status: "RECORDED" };
      },
    };
    const service = new SignaturePublicService(repository as never, provider);
    expect((await service.complete(issued.token, { outcome: "SIGNED", at: "2026-01-01T00:00:00Z", confirmed: false, requestIdentity: "r", correlationId: "c" })).status).toBe("UNAVAILABLE");
    const input = { outcome: "SIGNED" as const, at: "2026-01-01T00:00:00Z", confirmed: true, typedName: "Client", requestIdentity: "r", correlationId: "c" };
    expect((await service.complete(issued.token, input)).status).toBe("RECORDED");
    expect((await service.complete(issued.token, input)).status).toBe("REPLAY");
    expect((await service.complete(issued.token, { ...input, typedName: "Altered" })).status).toBe("CONFLICT");
  });

  it("rejects invalid tokens", async () => {
    const service = new SignaturePublicService({} as never, provider);
    expect((await service.complete("invalid", { outcome: "DECLINED", at: "x", confirmed: true, requestIdentity: "r", correlationId: "c" })).status).toBe("UNAVAILABLE");
  });
});
