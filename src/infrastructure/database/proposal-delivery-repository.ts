import { Prisma, type PrismaClient } from "@prisma/client";
import type { ProposalDeliveryReadRecord, ProposalDeliveryRepository } from "@/application/proposals/proposal-delivery-repository";
import { prisma } from "./prisma";

const include = {
  recipients: { orderBy: { displayOrder: "asc" as const } },
  events: { orderBy: [{ occurredAt: "asc" as const }, { id: "asc" as const }] },
  accesses: { orderBy: [{ accessedAt: "asc" as const }, { id: "asc" as const }] }
};

type DeliveryRow = Prisma.ProposalDeliveryGetPayload<{ include: typeof include }>;
function map(row: DeliveryRow): ProposalDeliveryReadRecord {
  return {
    id: row.id, companyId: row.companyId, proposalId: row.proposalId, proposalVersionId: row.proposalVersionId,
    proposalRepresentationId: row.proposalRepresentationId, representationType: row.representationType as "HTML" | "PDF",
    deliveryChannel: row.deliveryChannel as "SECURE_LINK", recipients: row.recipients.map(({ name, email, recipientRole }) => ({ name, email, recipientRole })),
    status: row.status as ProposalDeliveryReadRecord["status"], requestedAt: row.requestedAt.toISOString(), requestedByUserId: row.requestedByUserId,
    sentAt: row.sentAt?.toISOString() ?? null, failedAt: row.failedAt?.toISOString() ?? null, failureCode: row.failureCode,
    failureMessage: row.failureMessage, externalProviderReference: row.externalProviderReference, correlationId: row.correlationId,
    deliveryAttemptNumber: row.deliveryAttemptNumber, expiresAt: row.expiresAt.toISOString(), revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    events: row.events.map(({ id, eventType, occurredAt, actorUserId, correlationId }) => ({ id, eventType, occurredAt: occurredAt.toISOString(), actorUserId, correlationId })),
    accesses: row.accesses.map(({ id, accessedAt, accessType, correlationId }) => ({ id, accessedAt: accessedAt.toISOString(), accessType, correlationId }))
  };
}

export function createPrismaProposalDeliveryRepository(client: PrismaClient = prisma): ProposalDeliveryRepository {
  return {
    async representationSource(companyId, proposalId, representationId) {
      const row = await client.proposalRepresentation.findFirst({ where: { id: representationId, companyId, proposalId }, select: { proposalVersionId: true, representationType: true } });
      return row ? { proposalVersionId: row.proposalVersionId, representationType: row.representationType as "HTML" | "PDF" } : null;
    },
    async createOrReplay(input) {
      return client.$transaction(async (tx) => {
        const existing = await tx.proposalDelivery.findFirst({ where: { companyId: input.companyId, requestIdentity: input.requestIdentity }, include });
        if (existing) {
          const sameRecipients = JSON.stringify(existing.recipients.map(({ name, email, recipientRole }) => ({ name, email, recipientRole }))) === JSON.stringify(input.recipients);
          if (existing.proposalRepresentationId !== input.proposalRepresentationId || existing.expiresAt.toISOString() !== input.expiresAt || !sameRecipients) throw new Error("Proposal Delivery request identity conflicts with different input.");
          return { delivery: map(existing), idempotentReplay: true };
        }
        const representation = await tx.proposalRepresentation.findFirst({ where: { id: input.proposalRepresentationId, companyId: input.companyId, proposalId: input.proposalId, proposalVersionId: input.proposalVersionId } });
        if (!representation) throw new Error("Proposal Representation is unavailable.");
        await tx.proposalDelivery.create({ data: {
          id: input.id, companyId: input.companyId, proposalId: input.proposalId, proposalVersionId: input.proposalVersionId,
          proposalRepresentationId: input.proposalRepresentationId, representationType: input.representationType, deliveryChannel: "SECURE_LINK",
          status: "AVAILABLE", requestIdentity: input.requestIdentity, requestedAt: new Date(input.requestedAt), requestedByUserId: input.requestedByUserId,
          correlationId: input.correlationId, deliveryAttemptNumber: 1, tokenDigest: input.tokenDigest, expiresAt: new Date(input.expiresAt),
          recipients: { create: input.recipients.map((recipient, index) => ({ id: `${input.id}-recipient-${index + 1}`, displayOrder: index + 1, ...recipient })) },
          events: { create: [
            { id: `${input.id}-requested`, eventType: "DELIVERY_REQUESTED", occurredAt: new Date(input.requestedAt), actorUserId: input.requestedByUserId, correlationId: input.correlationId, metadata: {} },
            { id: `${input.id}-available`, eventType: "SECURE_LINK_AVAILABLE", occurredAt: new Date(input.requestedAt), actorUserId: input.requestedByUserId, correlationId: input.correlationId, metadata: {} }
          ] }
        } });
        return { delivery: map(await tx.proposalDelivery.findUniqueOrThrow({ where: { id: input.id }, include })), idempotentReplay: false };
      });
    },
    async detail(companyId, proposalId, deliveryId) { const row = await client.proposalDelivery.findFirst({ where: { id: deliveryId, companyId, proposalId }, include }); return row ? map(row) : null; },
    async list(companyId, proposalId) { return (await client.proposalDelivery.findMany({ where: { companyId, proposalId }, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], include })).map(map); },
    async revoke(companyId, proposalId, deliveryId, occurredAt, actorUserId, correlationId) {
      return client.$transaction(async (tx) => {
        const changed = await tx.proposalDelivery.updateMany({ where: { id: deliveryId, companyId, proposalId, status: "AVAILABLE", expiresAt: { gt: new Date(occurredAt) } }, data: { status: "REVOKED", revokedAt: new Date(occurredAt) } });
        if (!changed.count) return null;
        await tx.proposalDeliveryEvent.create({ data: { id: `${deliveryId}-revoked-${correlationId}`, deliveryId, companyId, eventType: "DELIVERY_REVOKED", occurredAt: new Date(occurredAt), actorUserId, correlationId, metadata: {} } });
        return map(await tx.proposalDelivery.findUniqueOrThrow({ where: { id: deliveryId }, include }));
      });
    },
    async expire(companyId, proposalId, deliveryId, occurredAt, actorUserId, correlationId) {
      return client.$transaction(async (tx) => {
        const changed = await tx.proposalDelivery.updateMany({ where: { id: deliveryId, companyId, proposalId, status: "AVAILABLE", expiresAt: { lte: new Date(occurredAt) } }, data: { status: "EXPIRED" } });
        if (!changed.count) return null;
        await tx.proposalDeliveryEvent.create({ data: { id: `${deliveryId}-expired-${correlationId}`, deliveryId, companyId, eventType: "DELIVERY_EXPIRED", occurredAt: new Date(occurredAt), actorUserId, correlationId, metadata: {} } });
        return map(await tx.proposalDelivery.findUniqueOrThrow({ where: { id: deliveryId }, include }));
      });
    },
    async resolveActiveAndRecordAccess(tokenDigest, occurredAt, correlationId) {
      return client.$transaction(async (tx) => {
        const delivery = await tx.proposalDelivery.findUnique({ where: { tokenDigest }, include: { representation: { include: { proposalVersion: { select: { versionNumber: true, draft: true } }, proposal: { select: { proposalNumber: true } } } } } });
        if (!delivery || delivery.status !== "AVAILABLE") return null;
        if (delivery.expiresAt.getTime() <= Date.parse(occurredAt)) {
          await tx.proposalDelivery.update({ where: { id: delivery.id }, data: { status: "EXPIRED" } });
          await tx.proposalDeliveryEvent.create({ data: { id: `${delivery.id}-expired-${correlationId}`, deliveryId: delivery.id, companyId: delivery.companyId, eventType: "DELIVERY_EXPIRED", occurredAt: new Date(occurredAt), actorUserId: null, correlationId, metadata: {} } });
          return null;
        }
        await tx.proposalDeliveryAccess.create({ data: { id: `${delivery.id}-access-${correlationId}`, deliveryId: delivery.id, companyId: delivery.companyId, accessedAt: new Date(occurredAt), accessType: "REPRESENTATION_RETRIEVED", correlationId } });
        const draft = delivery.representation.proposalVersion.draft as { title?: unknown };
        return { title: typeof draft.title === "string" ? draft.title : "Proposal", proposalNumber: delivery.representation.proposal.proposalNumber, proposalVersionNumber: delivery.representation.proposalVersion.versionNumber, representationType: delivery.representationType as "HTML" | "PDF", contentType: delivery.representation.contentType, content: new Uint8Array(delivery.representation.generatedContent), expiresAt: delivery.expiresAt.toISOString() };
      });
    }
  };
}
