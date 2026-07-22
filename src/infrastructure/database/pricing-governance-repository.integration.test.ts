import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PricingProject,
  PricingVersionNumber,
  type PricingCommandContext,
  type PricingDraft
} from "@/domain/pricing";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function command(project: PricingProject, suffix: string, actorId: string): PricingCommandContext {
  return {
    commandId: `command-${suffix}`,
    eventId: `event-${suffix}`,
    actorId,
    occurredAt: new Date().toISOString(),
    expectedRevision: project.revision
  };
}

describeWithDatabase("Pricing governance aggregate persistence", () => {
  async function fixture(suffix: string) {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const company = await prisma.company.create({ data: { name: `Phase 2 ${suffix}`, slug: `pricing-phase-2-${suffix}` } });
    await prisma.user.create({ data: { id: `auth-${suffix}`, email: `pricing-phase-2-${suffix}@example.test` } });
    const owner = await prisma.applicationUser.create({ data: {
      authUserId: `auth-${suffix}`, companyId: company.id, email: `pricing-phase-2-${suffix}@example.test`
    } });
    const client = await prisma.client.create({ data: {
      clientNumber: `CLI-${suffix}`, companyId: company.id, ownerId: owner.id,
      name: "Phase 2 Client", normalizedName: "phase 2 client"
    } });
    const pricingConfiguration = await prisma.pricingConfiguration.create({ data: { companyId: company.id } });
    const configuration = await prisma.pricingConfigurationVersion.create({
      data: {
        pricingConfigurationId: pricingConfiguration.id, companyId: company.id, version: 1,
        schemaVersion: 1, engineVersion: "pricing-engine/2.0.0", currency: "USD",
        configuration: {}, effectiveFrom: new Date()
      }
    });
    const draft: PricingDraft = {
      projectName: `Phase 2 persistence ${suffix}`,
      pricingModel: "PROJECT",
      currency: "USD",
      pricingConfigurationVersionId: configuration.id,
      pricingConfigurationVersion: configuration.version,
      configurationSchemaVersion: configuration.schemaVersion,
      engineVersion: configuration.engineVersion,
      methodologyVersion: "project-pricing/1.0.0",
      inputSnapshot: { services: [{ id: "service-1", quantity: "1.00" }] },
      outputSnapshot: { total: "1000.00", currency: "USD" },
      explanationSnapshot: { steps: [{ label: "Total", amount: "1000.00" }] },
      catalogSnapshot: { services: [{ id: "service-1", name: "Service" }] }
    };
    const created = PricingProject.create({
      pricingProjectId: `pricing-phase-2-${suffix}`,
      companyId: owner.companyId,
      clientId: client.id,
      ownerId: owner.id,
      estimateNumber: `PP-${Date.now()}${Math.floor(Math.random() * 1000)}`,
      draft
    }, {
      commandId: `command-create-${suffix}`,
      eventId: `event-create-${suffix}`,
      actorId: owner.id,
      occurredAt: new Date().toISOString()
    });
    return { prisma, owner, project: created.project, creationEvents: created.result.events };
  }

  it("round-trips the complete aggregate and immutable Versions losslessly", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project, creationEvents } = await fixture(suffix);
    const { createPrismaPricingAggregateRepository } = await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingAggregateRepository(prisma);
    try {
      await repository.save(project, 0, creationEvents);
      const saved = project.saveVersion(
        { pricingVersionId: `pricing-version-${suffix}`, content: project.draft },
        command(project, `save-${suffix}`, owner.id)
      );
      await repository.save(project, 1, saved.events);
      const expected = JSON.stringify(project.persistenceState);
      const loaded = await repository.load(owner.companyId, project.id.value);

      expect(JSON.stringify(loaded?.aggregate.persistenceState)).toBe(expected);
      expect(loaded?.aggregate.versions).toHaveLength(1);
      expect(Object.isFrozen(loaded?.aggregate.versions[0]?.content)).toBe(true);
      await expect(prisma.pricingVersion.update({
        where: { id: project.versions[0]!.id.value }, data: { creatorId: "forbidden" }
      })).rejects.toThrow(/immutable/i);
    } finally { /* Immutable audit fixtures intentionally remain isolated by Company. */ }
  }, 30_000);

  it("persists review, approval, revision, archive, and reconstructs legal state", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project, creationEvents } = await fixture(suffix);
    const reviewer = await prisma.applicationUser.findFirst({
      where: { companyId: owner.companyId, id: { not: owner.id } }
    });
    const reviewerId = reviewer?.id ?? `independent-reviewer-${suffix}`;
    const { createPrismaPricingAggregateRepository } = await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingAggregateRepository(prisma);
    try {
      await repository.save(project, 0, creationEvents);
      let previous = project.revision;
      let result = project.saveVersion({ pricingVersionId: `pricing-version-${suffix}`, content: project.draft }, command(project, `version-${suffix}`, owner.id));
      await repository.save(project, previous, result.events);
      previous = project.revision;
      result = project.requestQualityReview(PricingVersionNumber.create(1), command(project, `review-${suffix}`, owner.id));
      await repository.save(project, previous, result.events);
      expect((await repository.load(owner.companyId, project.id.value))?.aggregate.status).toBe("IN_REVIEW");
      previous = project.revision;
      result = project.approveVersion(command(project, `approve-${suffix}`, reviewerId));
      await repository.save(project, previous, result.events);
      previous = project.revision;
      result = project.beginRevision(command(project, `revision-${suffix}`, owner.id));
      await repository.save(project, previous, result.events);
      previous = project.revision;
      result = project.archive(command(project, `archive-${suffix}`, owner.id));
      await repository.save(project, previous, result.events);

      const loaded = await repository.load(owner.companyId, project.id.value);
      expect(loaded?.aggregate.status).toBe("ARCHIVED");
      expect(loaded?.aggregate.draftCurrency.revision).toBe(2);
      expect(loaded?.aggregate.reviewDecisions).toHaveLength(1);
      expect(loaded?.aggregate.approvedVersion?.approvedBy.value).toBe(reviewerId);
      expect(loaded?.aggregate.permittedTransitions()).toEqual([]);
      expect(await prisma.pricingGovernanceEventRecord.count({ where: { pricingProjectId: project.id.value } })).toBe(6);
      expect(await prisma.pricingProject.findUniqueOrThrow({ where: { id: project.id.value }, select: { archivedBy: true, archivedAt: true } })).toMatchObject({ archivedBy: owner.id, archivedAt: expect.any(Date) });
    } finally { /* Immutable audit fixtures intentionally remain isolated by Company. */ }
  }, 30_000);

  it("rejects stale writers and leaves the winning aggregate transaction intact", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project, creationEvents } = await fixture(suffix);
    const { createPrismaPricingAggregateRepository, PricingPersistenceConcurrencyError } = await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingAggregateRepository(prisma);
    try {
      await repository.save(project, 0, creationEvents);
      const first = (await repository.load(owner.companyId, project.id.value))!;
      const stale = (await repository.load(owner.companyId, project.id.value))!;
      const firstResult = first.aggregate.updateDraft({ ...first.aggregate.draft, projectName: "Winning Draft" }, command(first.aggregate, `winner-${suffix}`, owner.id));
      await repository.save(first.aggregate, first.revision, firstResult.events);
      const staleResult = stale.aggregate.updateDraft({ ...stale.aggregate.draft, projectName: "Stale Draft" }, command(stale.aggregate, `stale-${suffix}`, owner.id));
      await expect(repository.save(stale.aggregate, stale.revision, staleResult.events)).rejects.toBeInstanceOf(PricingPersistenceConcurrencyError);
      const loaded = await repository.load(owner.companyId, project.id.value);
      expect(loaded?.aggregate.draft.projectName).toBe("Winning Draft");
      expect(await prisma.pricingGovernanceEventRecord.count({ where: { eventId: `event-stale-${suffix}` } })).toBe(0);
    } finally { /* Immutable audit fixtures intentionally remain isolated by Company. */ }
  }, 30_000);

  it("rolls back the whole aggregate insert when a required relationship fails", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project } = await fixture(suffix);
    const invalid = PricingProject.create({
      ...project.persistenceState,
      pricingProjectId: `invalid-${suffix}`,
      clientId: `missing-client-${suffix}`,
      draft: project.draft
    }, {
      commandId: `invalid-command-${suffix}`,
      eventId: `invalid-event-${suffix}`,
      actorId: owner.id,
      occurredAt: new Date().toISOString()
    });
    const { createPrismaPricingAggregateRepository } = await import("@/infrastructure/database/pricing-repository");
    await expect(createPrismaPricingAggregateRepository(prisma).save(invalid.project, 0, invalid.result.events)).rejects.toThrow();
    expect(await prisma.pricingProject.findUnique({ where: { id: invalid.project.id.value } })).toBeNull();
    expect(await prisma.pricingDraft.findUnique({ where: { pricingProjectId: invalid.project.id.value } })).toBeNull();
    expect(await prisma.pricingGovernanceEventRecord.count({ where: { pricingProjectId: invalid.project.id.value } })).toBe(0);
  }, 30_000);

  it("preserves an identical command replay without duplicating command or event evidence", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project, creationEvents } = await fixture(suffix);
    const { createPrismaPricingAggregateRepository } = await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingAggregateRepository(prisma);
    await repository.save(project, 0, creationEvents);
    const replayContext = command(project, `update-${suffix}`, owner.id);
    const updatedDraft = { ...project.draft, projectName: "Idempotent Draft" };
    const first = project.updateDraft(updatedDraft, replayContext);
    await repository.save(project, 1, first.events);

    const loaded = (await repository.load(owner.companyId, project.id.value))!;
    const replay = loaded.aggregate.updateDraft(updatedDraft, replayContext);
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.events).toEqual([]);
    await repository.save(loaded.aggregate, loaded.revision, replay.events);

    expect(await prisma.pricingProcessedCommand.count({
      where: { companyId: owner.companyId, commandId: replayContext.commandId }
    })).toBe(1);
    expect(await prisma.pricingGovernanceEventRecord.count({
      where: { eventId: replayContext.eventId }
    })).toBe(1);
  }, 30_000);

  it("rejects a conflicting Company command identity and rolls back the aggregate insert", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project, creationEvents } = await fixture(suffix);
    const { createPrismaPricingAggregateRepository } = await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingAggregateRepository(prisma);
    await repository.save(project, 0, creationEvents);
    const state = project.persistenceState;
    const conflicting = PricingProject.create({
      pricingProjectId: `pricing-command-conflict-${suffix}`,
      companyId: state.companyId,
      clientId: state.clientId,
      ownerId: state.ownerId,
      estimateNumber: `PP-COMMAND-${suffix}`,
      draft: state.draft
    }, {
      commandId: creationEvents[0]!.commandId,
      eventId: `event-command-conflict-${suffix}`,
      actorId: owner.id,
      occurredAt: new Date().toISOString()
    });

    await expect(repository.save(conflicting.project, 0, conflicting.result.events)).rejects.toThrow();
    expect(await prisma.pricingProject.findUnique({
      where: { id: conflicting.project.id.value }
    })).toBeNull();
    expect(await prisma.pricingGovernanceEventRecord.findUnique({
      where: { eventId: `event-command-conflict-${suffix}` }
    })).toBeNull();
  }, 30_000);

  it("rejects a conflicting event identity and rolls back aggregate and command evidence", async () => {
    const suffix = crypto.randomUUID();
    const { prisma, owner, project, creationEvents } = await fixture(suffix);
    const { createPrismaPricingAggregateRepository } = await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingAggregateRepository(prisma);
    await repository.save(project, 0, creationEvents);
    const state = project.persistenceState;
    const commandId = `command-event-conflict-${suffix}`;
    const conflicting = PricingProject.create({
      pricingProjectId: `pricing-event-conflict-${suffix}`,
      companyId: state.companyId,
      clientId: state.clientId,
      ownerId: state.ownerId,
      estimateNumber: `PP-EVENT-${suffix}`,
      draft: state.draft
    }, {
      commandId,
      eventId: creationEvents[0]!.eventId,
      actorId: owner.id,
      occurredAt: new Date().toISOString()
    });

    await expect(repository.save(conflicting.project, 0, conflicting.result.events)).rejects.toThrow();
    expect(await prisma.pricingProject.findUnique({
      where: { id: conflicting.project.id.value }
    })).toBeNull();
    expect(await prisma.pricingProcessedCommand.findUnique({
      where: { companyId_commandId: { companyId: owner.companyId, commandId } }
    })).toBeNull();
  }, 30_000);
});
