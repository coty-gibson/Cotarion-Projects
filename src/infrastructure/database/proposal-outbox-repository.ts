import type { PrismaClient } from "@prisma/client";
import type { ProposalBusinessEventV1 } from "@/domain/proposals/contracts";
import { prisma } from "@/infrastructure/database/prisma";

export function createPrismaProposalOutboxRepository(client: PrismaClient = prisma) {
  return {
    async listPending(limit = 100): Promise<readonly ProposalBusinessEventV1[]> {
      const rows = await client.businessEventOutbox.findMany({
        where: { publishedAt: null },
        orderBy: [{ occurredAt: "asc" }, { eventId: "asc" }],
        take: limit,
        select: { payload: true }
      });
      return rows.map(({ payload }) => payload as unknown as ProposalBusinessEventV1);
    },

    async markPublished(eventId: string, publishedAt: Date) {
      await client.businessEventOutbox.updateMany({
        where: { eventId, publishedAt: null },
        data: { publishedAt, attemptCount: { increment: 1 }, lastError: null }
      });
    },

    async recordFailure(eventId: string, error: string) {
      await client.businessEventOutbox.updateMany({
        where: { eventId, publishedAt: null },
        data: { attemptCount: { increment: 1 }, lastError: error }
      });
    }
  };
}
