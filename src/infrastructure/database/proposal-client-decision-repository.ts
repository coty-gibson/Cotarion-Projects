import { Prisma, type PrismaClient } from "@prisma/client";
import type { ProposalClientDecisionRepository, ProposalDecisionReadRecord } from "@/application/proposals/proposal-client-decision-repository";
import { prisma } from "./prisma";

const include = { timeline: { orderBy: [{ occurredAt: "asc" as const }, { id: "asc" as const }] }, delivery: { select: { representationType: true } } };
type Row = Prisma.ProposalClientDecisionGetPayload<{ include: typeof include }>;
function map(row: Row): ProposalDecisionReadRecord { return { id: row.id, companyId: row.companyId, proposalId: row.proposalId, proposalVersionId: row.proposalVersionId, proposalRepresentationId: row.proposalRepresentationId, deliveryId: row.deliveryId, representationType: row.delivery.representationType as "HTML" | "PDF", outcome: row.outcome as ProposalDecisionReadRecord["outcome"], decidedAt: row.decidedAt.toISOString(), actorType: "SECURE_LINK_CLIENT", clientDisplayName: row.clientDisplayName, clientMessage: row.clientMessage, internalNotes: row.internalNotes, correlationId: row.correlationId, requestIdentity: row.requestIdentity, createdAt: row.createdAt.toISOString(), timeline: row.timeline.map(({ id, eventType, occurredAt, actorType, correlationId }) => ({ id, eventType, occurredAt: occurredAt.toISOString(), actorType, correlationId })) }; }

export function createPrismaProposalClientDecisionRepository(client: PrismaClient = prisma): ProposalClientDecisionRepository {
  return {
    async recordFromSecureDelivery(input) {
      return client.$transaction(async (tx) => {
        const delivery = await tx.proposalDelivery.findUnique({ where: { tokenDigest: input.tokenDigest }, include: { decision: { include }, representation: { include: { proposalVersion: { select: { versionNumber: true, draft: true } }, proposal: { select: { proposalNumber: true } } } } } });
        if (!delivery || delivery.status !== "AVAILABLE" || delivery.expiresAt.getTime() <= Date.parse(input.decidedAt)) return { status: "UNAVAILABLE" as const };
        if (delivery.decision) {
          if (delivery.decision.requestIdentity === input.requestIdentity && delivery.decision.outcome === input.outcome && delivery.decision.clientDisplayName === input.clientDisplayName && delivery.decision.clientMessage === input.clientMessage) {
            const draft = delivery.representation.proposalVersion.draft as { title?: unknown };
            return { status: "REPLAY" as const, decision: map(delivery.decision), title: typeof draft.title === "string" ? draft.title : "Proposal", proposalNumber: delivery.representation.proposal.proposalNumber, proposalVersionNumber: delivery.representation.proposalVersion.versionNumber };
          }
          return { status: "CONFLICT" as const };
        }
        const requestConflict = await tx.proposalClientDecision.findFirst({ where: { companyId: delivery.companyId, requestIdentity: input.requestIdentity } });
        if (requestConflict) return { status: "CONFLICT" as const };
        await tx.proposalClientDecision.create({ data: { id: input.id, companyId: delivery.companyId, proposalId: delivery.proposalId, proposalVersionId: delivery.proposalVersionId, proposalRepresentationId: delivery.proposalRepresentationId, deliveryId: delivery.id, outcome: input.outcome, decidedAt: new Date(input.decidedAt), actorType: "SECURE_LINK_CLIENT", clientDisplayName: input.clientDisplayName, clientMessage: input.clientMessage, internalNotes: null, correlationId: input.correlationId, requestIdentity: input.requestIdentity, timeline: { create: [{ id: `${input.id}-recorded`, eventType: `CLIENT_DECISION_${input.outcome}`, occurredAt: new Date(input.decidedAt), actorType: "SECURE_LINK_CLIENT", correlationId: input.correlationId, evidence: { outcome: input.outcome } }] } } });
        const decision = await tx.proposalClientDecision.findUniqueOrThrow({ where: { id: input.id }, include });
        const draft = delivery.representation.proposalVersion.draft as { title?: unknown };
        return { status: "RECORDED" as const, decision: map(decision), title: typeof draft.title === "string" ? draft.title : "Proposal", proposalNumber: delivery.representation.proposal.proposalNumber, proposalVersionNumber: delivery.representation.proposalVersion.versionNumber };
      });
    },
    async publicStatus(tokenDigest, occurredAt) { const row = await client.proposalDelivery.findUnique({ where: { tokenDigest }, select: { status: true, expiresAt: true, decision: { select: { outcome: true } } } }); if (!row) return null; return { eligible: row.status === "AVAILABLE" && row.expiresAt.getTime() > Date.parse(occurredAt) && !row.decision, outcome: (row.decision?.outcome as ProposalDecisionReadRecord["outcome"] | undefined) ?? null }; },
    async list(companyId, proposalId) { return (await client.proposalClientDecision.findMany({ where: { companyId, proposalId }, orderBy: [{ decidedAt: "desc" }, { id: "desc" }], include })).map(map); },
    async current(companyId, proposalId) { const row = await client.proposalClientDecision.findFirst({ where: { companyId, proposalId }, orderBy: [{ decidedAt: "desc" }, { id: "desc" }], include }); return row ? map(row) : null; },
    async byDelivery(companyId, proposalId, deliveryId) { const row = await client.proposalClientDecision.findFirst({ where: { companyId, proposalId, deliveryId }, include }); return row ? map(row) : null; }
  };
}
