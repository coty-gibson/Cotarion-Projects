import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;
class Rollback extends Error {}

describeWithDatabase("Pricing read repository", () => {
  it("queries lists, detail, Version history, and review history without aggregate reconstruction", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { createPrismaPricingReadRepository } = await import("@/infrastructure/database/pricing-read-repository");
    await expect(prisma.$transaction(async (transaction) => {
      const suffix = crypto.randomUUID();
      const company = await transaction.company.create({ data: { name: "Pricing Read Test", slug: `pricing-read-${suffix}` } });
      await transaction.user.createMany({ data: [
        { id: `owner-auth-${suffix}`, email: `owner-${suffix}@example.test` },
        { id: `reviewer-auth-${suffix}`, email: `reviewer-${suffix}@example.test` }
      ] });
      const owner = await transaction.applicationUser.create({ data: {
        authUserId: `owner-auth-${suffix}`, companyId: company.id,
        email: `owner-${suffix}@example.test`, name: "Pricing Owner"
      } });
      const reviewer = await transaction.applicationUser.create({ data: {
        authUserId: `reviewer-auth-${suffix}`, companyId: company.id,
        email: `reviewer-${suffix}@example.test`, name: "Quality Reviewer"
      } });
      const client = await transaction.client.create({ data: {
        clientNumber: `CLI-${suffix}`, companyId: company.id, ownerId: owner.id,
        name: "Acme Advisory", normalizedName: "acme advisory"
      } });
      const configuration = await transaction.pricingConfiguration.create({ data: { companyId: company.id } });
      const configurationVersion = await transaction.pricingConfigurationVersion.create({ data: {
        pricingConfigurationId: configuration.id, companyId: company.id, version: 1,
        schemaVersion: 1, engineVersion: "pricing-engine/2.0.0", currency: "USD",
        configuration: {}, effectiveFrom: new Date("2026-07-20T00:00:00.000Z")
      } });
      const base = BigInt(Date.now()) * BigInt(100);
      const projects = [
        { id: crypto.randomUUID(), name: "Alpha Strategy", status: "QUOTED" as const, model: "PROJECT" as const, updatedAt: new Date("2026-07-21T12:03:00.000Z") },
        { id: crypto.randomUUID(), name: "Beta Retainer", status: "DRAFT" as const, model: "FIXED_RETAINER" as const, updatedAt: new Date("2026-07-21T12:02:00.000Z") },
        { id: crypto.randomUUID(), name: "Gamma Advisory", status: "ARCHIVED" as const, model: "ADVISORY_HOURLY" as const, updatedAt: new Date("2026-07-21T12:01:00.000Z") }
      ];
      for (const [index, project] of projects.entries()) {
        await transaction.pricingProject.create({ data: {
          id: project.id, estimateNumber: `PP-${(base + BigInt(index)).toString()}`,
          companyId: company.id, clientId: client.id, ownerId: owner.id,
          pricingConfigurationVersionId: configurationVersion.id, projectName: project.name,
          pricingModel: project.model, status: project.status, currency: "USD",
          aggregateRevision: 1, draftCurrencyRevision: 1,
          createdAt: new Date("2026-07-21T12:00:00.000Z"), updatedAt: project.updatedAt,
          governanceDraft: { create: {
            projectName: project.name, pricingModel: project.model,
            currency: "USD", pricingConfigurationVersionId: configurationVersion.id,
            pricingConfigurationVersion: 1, configurationSchemaVersion: 1,
            engineVersion: "pricing-engine/2.0.0", methodologyVersion: "project-pricing/1.0.0",
            inputSnapshot: {}, outputSnapshot: {}, explanationSnapshot: {}, catalogSnapshot: {},
            draftCurrencyRevision: 1, updatedAt: project.updatedAt
          }}
        }});
      }
      const quoted = projects[0];
      const versionId = crypto.randomUUID();
      await transaction.pricingVersion.create({ data: {
        id: versionId, pricingProjectId: quoted.id, companyId: company.id, versionNumber: 1,
        creatorId: owner.id, createdAt: new Date("2026-07-21T12:04:00.000Z"), draftCurrencyRevision: 1,
        projectName: quoted.name, pricingModel: quoted.model, currency: "USD",
        pricingConfigurationVersionId: configurationVersion.id, pricingConfigurationVersion: 1,
        configurationSchemaVersion: 1, engineVersion: "pricing-engine/2.0.0",
        methodologyVersion: "project-pricing/1.0.0", inputSnapshot: {}, outputSnapshot: {},
        explanationSnapshot: {}, catalogSnapshot: {}
      }});
      await transaction.pricingReviewDecision.create({ data: {
        id: `decision-${suffix}`, pricingProjectId: quoted.id, companyId: company.id,
        pricingVersionId: versionId, versionNumber: 1, outcome: "APPROVED",
        decidedBy: reviewer.id, decidedAt: new Date("2026-07-21T12:06:00.000Z")
      }});
      await transaction.pricingProject.update({ where: { id: quoted.id }, data: {
        approvedVersionId: versionId, approvedBy: reviewer.id,
        approvedAt: new Date("2026-07-21T12:06:00.000Z")
      }});
      await transaction.pricingGovernanceEventRecord.createMany({ data: [
        {
          eventId: `request-${suffix}`, pricingProjectId: quoted.id, companyId: company.id,
          eventType: "QualityReviewRequested", commandId: `request-command-${suffix}`,
          actorId: owner.id, occurredAt: new Date("2026-07-21T12:05:00.000Z"), aggregateRevision: 3,
          payload: { pricingVersionId: versionId, versionNumber: 1 }
        },
        {
          eventId: `approval-${suffix}`, pricingProjectId: quoted.id, companyId: company.id,
          eventType: "QualityReviewApproved", commandId: `approval-command-${suffix}`,
          actorId: reviewer.id, occurredAt: new Date("2026-07-21T12:06:00.000Z"), aggregateRevision: 4,
          payload: { pricingVersionId: versionId, versionNumber: 1 }
        }
      ] });

      const repository = createPrismaPricingReadRepository(transaction);
      const defaults = { page: 1, pageSize: 25, sortBy: "lastUpdated" as const, sortDirection: "desc" as const };
      const list = await repository.list(company.id, defaults);
      expect(list.items.map(({ projectName }) => projectName)).toEqual(["Alpha Strategy", "Beta Retainer", "Gamma Advisory"]);
      expect(list.total).toBe(3);
      expect((await repository.list(company.id, { ...defaults, search: "acme" })).total).toBe(3);
      expect((await repository.list(company.id, { ...defaults, search: "Alpha" })).items).toHaveLength(1);
      expect((await repository.list(company.id, { ...defaults, status: "DRAFT" })).items[0]?.projectName).toBe("Beta Retainer");
      expect((await repository.list(company.id, { ...defaults, pricingModel: "ADVISORY_HOURLY" })).items[0]?.projectName).toBe("Gamma Advisory");
      const page = await repository.list(company.id, { ...defaults, page: 2, pageSize: 1, sortBy: "projectName", sortDirection: "asc" });
      expect(page.items[0]?.projectName).toBe("Beta Retainer");
      expect(page.totalPages).toBe(3);
      expect((await repository.list("other-company", defaults)).items).toEqual([]);

      const detail = await repository.detail(company.id, quoted.id);
      expect(detail?.summary.currentVersion).toEqual({ id: versionId, number: 1 });
      expect(detail?.draft).not.toHaveProperty("inputSnapshot");
      expect(detail?.versionCount).toBe(1);
      expect(detail?.versions[0]).toMatchObject({ approvalStatus: "APPROVED", reviewer: { name: "Quality Reviewer" } });
      expect(detail?.reviews.map(({ type }) => type)).toEqual(["REQUESTED", "APPROVED"]);
      expect(await repository.versions(company.id, quoted.id)).toHaveLength(1);
      expect(await repository.reviews(company.id, quoted.id)).toHaveLength(2);
      expect(await repository.detail(company.id, crypto.randomUUID())).toBeNull();
      expect(await repository.versions(company.id, crypto.randomUUID())).toBeNull();
      expect(await repository.reviews(company.id, crypto.randomUUID())).toBeNull();
      const editableSource = await repository.editableDraft(company.id, quoted.id);
      expect(editableSource?.draft).toMatchObject({
        inputSnapshot: {}, outputSnapshot: {}, explanationSnapshot: {}, catalogSnapshot: {}
      });
      const { PricingQueryService } = await import("@/application/pricing/pricing-query-service");
      const queryService = new PricingQueryService({
        load: async () => ({ userId: owner.id, companyId: company.id, active: true })
      }, {
        capabilitiesFor: async () => new Set(["pricing:begin-revision", "pricing:archive-quoted"] as const)
      }, repository);
      const editable = await queryService.editableDraft(
        { id: owner.authUserId, email: owner.email }, company.id, quoted.id
      );
      expect(editable.concurrencyToken).toEqual(expect.any(String));
      expect(editable).not.toHaveProperty("concurrencyVersion");
      expect(editable).not.toHaveProperty("revision");
      expect(editable.draft.catalogSnapshot).toEqual({});
      expect(editable.permittedActions).toEqual(["BEGIN_REVISION", "ARCHIVE"]);
      throw new Rollback();
    }, { maxWait: 15_000, timeout: 30_000 })).rejects.toBeInstanceOf(Rollback);
  }, 45_000);
});
