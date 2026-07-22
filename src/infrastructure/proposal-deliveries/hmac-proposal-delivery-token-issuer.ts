import { createHash, createHmac } from "node:crypto";
import type { ProposalDeliveryTokenIssuer } from "@/application/proposals/proposal-delivery-token";

export class HmacProposalDeliveryTokenIssuer implements ProposalDeliveryTokenIssuer {
  constructor(private readonly secret: string) {
    if (Buffer.byteLength(secret) < 32) throw new Error("Proposal Delivery token secret must contain at least 32 bytes.");
  }
  issue(companyId: string, requestIdentity: string) {
    const token = createHmac("sha256", this.secret).update(`proposal-delivery-v1:${companyId}:${requestIdentity}`).digest("base64url");
    return { token, digest: this.digest(token) };
  }
  digest(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
}
