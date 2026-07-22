import type { ProposalDeliveryTokenIssuer } from "./proposal-delivery-token";
import type { ProposalClientDecisionRepository } from "./proposal-client-decision-repository";

export class ProposalClientDecisionPublicService {
  constructor(private readonly repository: ProposalClientDecisionRepository, private readonly tokens: ProposalDeliveryTokenIssuer, private readonly nextId: () => string = () => crypto.randomUUID()) {}
  status(token: string, occurredAt: string) { return /^[A-Za-z0-9_-]{43}$/.test(token) ? this.repository.publicStatus(this.tokens.digest(token), occurredAt) : null; }
  record(token: string, input: { outcome: "ACCEPTED" | "DECLINED"; decidedAt: string; clientDisplayName?: string; clientMessage?: string; correlationId: string; requestIdentity: string }) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return Promise.resolve({ status: "UNAVAILABLE" as const });
    const displayName = input.clientDisplayName?.trim() || null; const message = input.clientMessage?.trim() || null;
    if ((displayName?.length ?? 0) > 200 || (message?.length ?? 0) > 5_000) return Promise.resolve({ status: "UNAVAILABLE" as const });
    return this.repository.recordFromSecureDelivery({ id: `proposal-decision-${this.nextId()}`, tokenDigest: this.tokens.digest(token), outcome: input.outcome, decidedAt: input.decidedAt, clientDisplayName: displayName, clientMessage: message, correlationId: input.correlationId, requestIdentity: input.requestIdentity });
  }
}
