import { describe, expect, it } from "vitest";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { ProposalDeliveryService } from "./proposal-delivery-service";
import { ProposalDeliveryPublicService } from "./proposal-delivery-public-service";
import { ProposalApplicationError } from "./proposal-application-errors";
import { PROPOSAL_CAPABILITIES, type ProposalCapability } from "./proposal-capabilities";
import type { CreateProposalDeliveryRecord, ProposalDeliveryReadRecord, ProposalDeliveryRepository } from "./proposal-delivery-repository";
import { HmacProposalDeliveryTokenIssuer } from "@/infrastructure/proposal-deliveries/hmac-proposal-delivery-token-issuer";

const identity: AuthenticatedIdentity = { id: "auth-1", email: "member@example.com", name: "Member" };
const actor = { userId: "user-1", companyId: "company-1", active: true };
const tokens = new HmacProposalDeliveryTokenIssuer("a-strong-secret-with-more-than-thirty-two-bytes");

class MemoryDeliveryRepository implements ProposalDeliveryRepository {
  records = new Map<string, ProposalDeliveryReadRecord>();
  inputs = new Map<string, CreateProposalDeliveryRecord>();
  artifact = new TextEncoder().encode("exact immutable PDF bytes");
  async representationSource(companyId: string, proposalId: string, representationId: string) {
    return companyId === "company-1" && proposalId === "proposal-1" && representationId === "representation-1" ? { proposalVersionId: "version-1", representationType: "PDF" as const } : null;
  }
  async createOrReplay(input: CreateProposalDeliveryRecord) {
    const existingInput = this.inputs.get(input.requestIdentity);
    if (existingInput) {
      if (JSON.stringify({ ...existingInput, id: "" }) !== JSON.stringify({ ...input, id: "" })) throw new Error("request identity conflict");
      return { delivery: this.records.get(input.requestIdentity)!, idempotentReplay: true };
    }
    const delivery: ProposalDeliveryReadRecord = { ...input, deliveryChannel: "SECURE_LINK", status: "AVAILABLE", sentAt: null, failedAt: null, failureCode: null, failureMessage: null, externalProviderReference: null, deliveryAttemptNumber: 1, revokedAt: null, createdAt: input.requestedAt, updatedAt: input.requestedAt, events: [{ id: `${input.id}-requested`, eventType: "DELIVERY_REQUESTED", occurredAt: input.requestedAt, actorUserId: input.requestedByUserId, correlationId: input.correlationId }], accesses: [] };
    this.inputs.set(input.requestIdentity, structuredClone(input)); this.records.set(input.requestIdentity, structuredClone(delivery));
    return { delivery, idempotentReplay: false };
  }
  async detail(companyId: string, proposalId: string, deliveryId: string) { return [...this.records.values()].find((record) => record.companyId === companyId && record.proposalId === proposalId && record.id === deliveryId) ?? null; }
  async list(companyId: string, proposalId: string) { return [...this.records.values()].filter((record) => record.companyId === companyId && record.proposalId === proposalId); }
  async revoke(companyId: string, proposalId: string, deliveryId: string, occurredAt: string) { const record = await this.detail(companyId, proposalId, deliveryId); return record && record.status === "AVAILABLE" ? { ...record, status: "REVOKED" as const, revokedAt: occurredAt, updatedAt: occurredAt } : null; }
  async expire() { return null; }
  async resolveActiveAndRecordAccess(digest: string, occurredAt: string, correlationId: string) {
    const match = [...this.inputs].find(([, input]) => input.tokenDigest === digest);
    if (!match) return null;
    const record = this.records.get(match[0])!;
    if (record.status !== "AVAILABLE" || Date.parse(record.expiresAt) <= Date.parse(occurredAt)) return null;
    this.records.set(match[0], { ...record, accesses: [...record.accesses, { id: `access-${correlationId}`, accessedAt: occurredAt, accessType: "REPRESENTATION_RETRIEVED", correlationId }] });
    return { title: "Proposal", proposalNumber: "PROP-1", proposalVersionNumber: 1, representationType: "PDF" as const, contentType: "application/pdf", content: this.artifact, expiresAt: record.expiresAt };
  }
}

function services(capabilities: readonly ProposalCapability[] = [PROPOSAL_CAPABILITIES.CREATE_DELIVERY, PROPOSAL_CAPABILITIES.REVOKE_DELIVERY]) {
  const repository = new MemoryDeliveryRepository(); let sequence = 0;
  const service = new ProposalDeliveryService({ load: async () => actor }, { capabilitiesFor: async () => new Set(capabilities) }, repository, tokens, () => String(++sequence));
  return { repository, service, publicService: new ProposalDeliveryPublicService(repository, tokens) };
}
const input = { proposalId: "proposal-1", representationId: "representation-1", recipients: [{ name: " Client ", email: "CLIENT@EXAMPLE.COM", recipientRole: " Buyer " }], expiresAt: "2026-07-22T12:00:00.000Z", requestIdentity: "request-1", correlationId: "correlation-1", requestedAt: "2026-07-21T12:00:00.000Z" };

describe("ProposalDeliveryService", () => {
  it("creates one immutable-representation Delivery and replays the same request idempotently", async () => {
    const { service, repository, publicService } = services();
    const first = await service.create(identity, "company-1", input);
    const replay = await service.create(identity, "company-1", input);
    expect(first.delivery.id).toBe(replay.delivery.id);
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.secureToken).toBe(first.secureToken);
    expect(repository.records.size).toBe(1);
    expect(first.delivery.recipients).toEqual([{ name: "Client", email: "client@example.com", recipientRole: "Buyer" }]);
    expect(repository.inputs.get("request-1")?.tokenDigest).not.toBe(first.secureToken);
    const artifact = await publicService.resolve(first.secureToken, "2026-07-21T13:00:00.000Z", "access-1");
    expect(artifact?.content).toEqual(repository.artifact);
  });

  it("allows an explicitly new request identity to create separate evidence", async () => {
    const { service, repository } = services();
    await service.create(identity, "company-1", input);
    await service.create(identity, "company-1", { ...input, requestIdentity: "request-2", correlationId: "correlation-2" });
    expect(repository.records.size).toBe(2);
  });

  it("rejects conflicting idempotency input and preserves the original recipient snapshot", async () => {
    const { service, repository } = services();
    const original = await service.create(identity, "company-1", input);
    await expect(service.create(identity, "company-1", { ...input, recipients: [{ name: "Different", email: "different@example.com", recipientRole: null }] })).rejects.toThrow(/conflict/);
    expect(repository.records.size).toBe(1);
    expect(original.delivery.recipients[0].email).toBe("client@example.com");
  });

  it("enforces capability and Company isolation before persistence", async () => {
    const denied = services([]);
    await expect(denied.service.create(identity, "company-1", input)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" } satisfies Partial<ProposalApplicationError>);
    await expect(services().service.create(identity, "company-2", input)).rejects.toMatchObject({ code: "COMPANY_SCOPE_VIOLATION" } satisfies Partial<ProposalApplicationError>);
    expect(denied.repository.records.size).toBe(0);
  });
});
