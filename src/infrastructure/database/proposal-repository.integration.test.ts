import { describe, expect, it } from "vitest";
import { PRICING_SNAPSHOT_SCHEMA_VERSION } from "@/domain/proposals/contracts";
import { engagementTypePolicy } from "@/domain/proposals/engagement-type-policies";
import { ProposalAggregate } from "@/domain/proposals/proposal-domain";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("Proposal persistence", () => {
  it("allocates globally unique Proposal numbers concurrently and seeds policy idempotently", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const { createPrismaProposalRepository } = await import(
      "@/infrastructure/database/proposal-repository"
    );
    const owner = await prisma.applicationUser.findFirstOrThrow();
    const firstGroupId = await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);
    const secondGroupId = await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);
    expect(secondGroupId).toBe(firstGroupId);
    expect(
      await prisma.engagementTypePolicyVersion.count({
        where: { companyId: owner.companyId, operatingGroupId: firstGroupId, policyVersion: 1 }
      })
    ).toBe(5);

    const repository = createPrismaProposalRepository(prisma);
    const identities = await Promise.all(
      Array.from({ length: 10 }, () => repository.allocateProposalIdentity())
    );
    expect(new Set(identities.map(({ proposalNumber }) => proposalNumber)).size).toBe(10);
    expect(identities.every(({ proposalNumber }) => /^PRO-\d{6,}$/.test(proposalNumber))).toBe(true);
  }, 30_000);

  it("persists and rehydrates state with its event/outbox atomically and protects immutable rows", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { ensureConsultingEngagementTypePolicies } = await import(
      "@/infrastructure/database/proposal-seed"
    );
    const { insertProposalInTransaction } = await import(
      "@/infrastructure/database/proposal-repository"
    );
    const owner = await prisma.applicationUser.findFirstOrThrow();
    await ensureConsultingEngagementTypePolicies(owner.companyId, prisma);

    await expect(
      prisma.$transaction(async (transaction) => {
        const suffix = crypto.randomUUID();
        const client = await transaction.client.create({
          data: {
            id: `proposal-test-client-${suffix}`,
            clientNumber: `CLI-9${Date.now()}`,
            companyId: owner.companyId,
            ownerId: owner.id,
            name: "Proposal Persistence Transaction Test",
            normalizedName: "proposal persistence transaction test"
          }
        });
        const configuration = await transaction.pricingConfigurationVersion.findFirstOrThrow({
          where: { companyId: owner.companyId, status: "ACTIVE" }
        });
        const pricing = await transaction.pricingProject.create({
          data: {
            id: `proposal-test-pricing-${suffix}`,
            estimateNumber: `PP-9${Date.now()}`,
            companyId: owner.companyId,
            clientId: client.id,
            ownerId: owner.id,
            pricingConfigurationVersionId: configuration.id,
            projectName: "Quoted source",
            status: "QUOTED"
          }
        });
        const aggregate = ProposalAggregate.create(
          {
            id: `proposal-test-${suffix}`,
            proposalNumber: `PRO-9${Date.now()}`,
            companyId: owner.companyId,
            clientId: client.id,
            ownerId: owner.id,
            engagementTypePolicy: engagementTypePolicy("PROJECT"),
            pricingSnapshot: {
              schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
              pricingProjectId: pricing.id,
              pricingProjectNumber: pricing.estimateNumber,
              companyId: owner.companyId,
              clientId: client.id,
              operatingGroupCode: "CONSULTING",
              sourceStatus: "QUOTED",
              pricingConfigurationVersionId: configuration.id,
              pricingConfigurationVersion: configuration.version,
              engineVersion: configuration.engineVersion,
              pricingModel: "PROJECT",
              methodologyVersion: "project-pricing/1.0.0",
              inputSnapshot: {},
              outputSnapshot: {
                pricingModel: "PROJECT", methodologyVersion: "project-pricing/1.0.0",
                projectSubtotal: "100.00", complexityMultiplier: "1", adjustedSubtotal: "100.00",
                discountRate: "0", discountAmount: "0.00", finalAmount: "100.00", currency: "USD"
              },
              approvedAt: "2026-07-20T10:00:00.000Z",
              approvedByUserId: owner.id,
              capturedAt: "2026-07-20T10:01:00.000Z"
            },
            title: "Persistence test"
          },
          { eventId: `proposal-test-event-${suffix}`, occurredAt: "2026-07-20T12:00:00.000Z", responsibleUserId: owner.id }
        );
        await insertProposalInTransaction(transaction, aggregate.persistenceState);

        expect(await transaction.proposalEvent.count({ where: { proposalId: aggregate.state.id } })).toBe(1);
        expect(await transaction.businessEventOutbox.count({ where: { proposalId: aggregate.state.id } })).toBe(1);
        const stored = await transaction.proposal.findUniqueOrThrow({
          where: { id: aggregate.state.id }, select: { aggregateState: true }
        });
        expect(
          ProposalAggregate.rehydrate(
            stored.aggregateState as unknown as typeof aggregate.persistenceState,
            engagementTypePolicy("PROJECT")
          ).state
        ).toEqual(aggregate.state);
        expect(
          await transaction.proposal.findFirst({ where: { id: aggregate.state.id, companyId: "other-company" } })
        ).toBeNull();
        await transaction.proposalEvent.update({
          where: { eventId: aggregate.state.events[0].eventId }, data: { eventType: "CHANGED" }
        });
      })
    ).rejects.toThrow(/immutable/i);
  }, 30_000);
});
