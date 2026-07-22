import type { ProposalDeliveryRepository } from "./proposal-delivery-repository";
import type { ProposalDeliveryTokenIssuer } from "./proposal-delivery-token";

export class ProposalDeliveryPublicService {
  constructor(private readonly repository: ProposalDeliveryRepository, private readonly tokens: ProposalDeliveryTokenIssuer) {}
  resolve(token: string, occurredAt: string, correlationId: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return this.repository.resolveActiveAndRecordAccess(this.tokens.digest(token), occurredAt, correlationId);
  }
}
