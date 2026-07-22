import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalApplicationError } from "./proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalActorContextProvider, type ProposalCapability, type ProposalCapabilityEvaluator } from "./proposal-capabilities";
import type { ProposalDeliveryRecipientSnapshot } from "@/domain/proposals/proposal-delivery";
import type { ProposalDeliveryRepository } from "./proposal-delivery-repository";
import type { ProposalDeliveryTokenIssuer } from "./proposal-delivery-token";

export class ProposalDeliveryService {
  constructor(private readonly actors: ProposalActorContextProvider, private readonly capabilities: ProposalCapabilityEvaluator, private readonly repository: ProposalDeliveryRepository, private readonly tokens: ProposalDeliveryTokenIssuer, private readonly nextId: () => string = () => crypto.randomUUID()) {}

  async create(identity: AuthenticatedIdentity, companyId: string, input: { proposalId: string; representationId: string; recipients: readonly ProposalDeliveryRecipientSnapshot[]; expiresAt: string; requestIdentity: string; correlationId: string; requestedAt: string }) {
    const actor = await this.authorize(identity, companyId, PROPOSAL_CAPABILITIES.CREATE_DELIVERY);
    if (!input.recipients.length) throw new ProposalApplicationError("INVALID_REQUEST", "At least one governed recipient is required.");
    if (Date.parse(input.expiresAt) <= Date.parse(input.requestedAt)) throw new ProposalApplicationError("INVALID_REQUEST", "Delivery expiration must be in the future.");
    const recipients = input.recipients.map((recipient) => ({ name: recipient.name.trim(), email: recipient.email.trim().toLowerCase(), recipientRole: recipient.recipientRole?.trim() || null }));
    if (recipients.some(({ name, email }) => !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) throw new ProposalApplicationError("INVALID_REQUEST", "Delivery recipient is invalid.");
    const representation = await this.repository.representationSource(companyId, input.proposalId, input.representationId);
    if (!representation) throw new ProposalApplicationError("PROPOSAL_NOT_FOUND", "Proposal Representation was not found.");
    const token = this.tokens.issue(companyId, input.requestIdentity);
    const result = await this.repository.createOrReplay({ id: `proposal-delivery-${this.nextId()}`, companyId, proposalId: input.proposalId, proposalVersionId: representation.proposalVersionId, proposalRepresentationId: input.representationId, representationType: representation.representationType, requestIdentity: input.requestIdentity, recipients, requestedAt: input.requestedAt, requestedByUserId: actor.userId, correlationId: input.correlationId, tokenDigest: token.digest, expiresAt: input.expiresAt });
    return { ...result, secureToken: token.token };
  }

  async revoke(identity: AuthenticatedIdentity, companyId: string, input: { proposalId: string; deliveryId: string; occurredAt: string; correlationId: string }) {
    const actor = await this.authorize(identity, companyId, PROPOSAL_CAPABILITIES.REVOKE_DELIVERY);
    const delivery = await this.repository.revoke(companyId, input.proposalId, input.deliveryId, input.occurredAt, actor.userId, input.correlationId);
    if (!delivery) throw new ProposalApplicationError("DOMAIN_RULE_VIOLATION", "Only an available Delivery can be revoked.");
    return delivery;
  }

  async expire(identity: AuthenticatedIdentity, companyId: string, input: { proposalId: string; deliveryId: string; occurredAt: string; correlationId: string }) {
    const actor = await this.authorize(identity, companyId, PROPOSAL_CAPABILITIES.REVOKE_DELIVERY);
    const delivery = await this.repository.expire(companyId, input.proposalId, input.deliveryId, input.occurredAt, actor.userId, input.correlationId);
    if (!delivery) throw new ProposalApplicationError("DOMAIN_RULE_VIOLATION", "Delivery is not eligible to expire.");
    return delivery;
  }

  private async authorize(identity: AuthenticatedIdentity, companyId: string, capability: ProposalCapability) {
    const actor = await this.actors.load(identity);
    if (!actor || !actor.active) throw new ProposalApplicationError("NOT_AUTHENTICATED", "An active authenticated Application User is required.");
    if (actor.companyId !== companyId) throw new ProposalApplicationError("COMPANY_SCOPE_VIOLATION", "The authenticated actor does not belong to the requested Company.");
    if (!(await this.capabilities.capabilitiesFor(actor)).has(capability)) throw new ProposalApplicationError("CAPABILITY_DENIED", `Capability ${capability} is required.`);
    return actor;
  }
}
