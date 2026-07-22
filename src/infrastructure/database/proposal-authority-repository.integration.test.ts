import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { DefaultProposalCapabilityEvaluator, PROPOSAL_CAPABILITIES } from "@/application/proposals/proposal-capabilities";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;
class RollbackMarker extends Error {}

async function user(transaction: Prisma.TransactionClient, companyId: string, suffix: string) {
  const auth = await transaction.user.create({ data: { id: `authority-auth-${suffix}`, email: `authority-${suffix}@example.com` } });
  return transaction.applicationUser.create({ data: { id: `authority-user-${suffix}`, authUserId: auth.id, companyId, email: auth.email!, name: suffix } });
}

describeWithDatabase("Proposal production authority", () => {
  it("persists governed Founder/Admin authority, audit evidence, isolation, and capability defaults", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { createCompanyAuthorityTransactionScope } = await import("@/infrastructure/database/proposal-authority-repository");
    const { createPrismaProposalActorContextProvider } = await import("@/infrastructure/database/proposal-authority-adapters");
    const { createProductionProposalServices } = await import("@/infrastructure/proposal-production-composition");
    const composition = createProductionProposalServices(prisma);
    expect(composition.application).toBeDefined();
    expect(composition.queries).toBeDefined();
    const suffix = crypto.randomUUID();

    await expect(prisma.$transaction(async (transaction) => {
      const company = await transaction.company.create({ data: { id: `authority-company-${suffix}`, name: "Authority Test", slug: `authority-${suffix}` } });
      const otherCompany = await transaction.company.create({ data: { id: `authority-other-${suffix}`, name: "Other Authority", slug: `authority-other-${suffix}` } });
      const founder = await user(transaction, company.id, `${suffix}-founder`);
      const admin = await user(transaction, company.id, `${suffix}-admin`);
      const successor = await user(transaction, company.id, `${suffix}-successor`);
      const outsider = await user(transaction, otherCompany.id, `${suffix}-outsider`);
      const authority = createCompanyAuthorityTransactionScope(transaction);
      const evidence = (auditId: string, affectedUserId: string, actorUserId = founder.id) => ({
        auditId: `${suffix}-${auditId}`,
        actorIdentity: actorUserId,
        actorUserId,
        companyId: company.id,
        affectedUserId,
        businessJustification: "Documented governance test justification.",
        occurredAt: "2026-07-21T14:00:00.000Z",
        evidence: { source: "integration-test" }
      });

      await authority.bootstrapNewCompanyFounder(evidence("bootstrap", founder.id));
      await authority.bootstrapNewCompanyFounder(evidence("bootstrap", founder.id));
      expect(await authority.effectiveRole(company.id, founder.id)).toBe("FOUNDER");
      expect(await transaction.roleAdministrationAudit.count({ where: { companyId: company.id } })).toBe(1);

      await expect(authority.recoverFounder({ ...evidence("duplicate-founder", successor.id), actorIdentity: "platform-operator", actorUserId: undefined })).rejects.toMatchObject({ code: "CONFLICTING_FOUNDER_SEAT" });
      await expect(authority.assignAdmin(evidence("cross-company", outsider.id))).rejects.toMatchObject({ code: "ACTOR_INACTIVE" });

      await authority.assignAdmin(evidence("assign-admin", admin.id));
      expect(await authority.effectiveRole(company.id, admin.id)).toBe("ADMIN");
      const evaluator = new DefaultProposalCapabilityEvaluator({ roleFor: (actor) => authority.effectiveRole(actor.companyId, actor.userId) });
      const adminCapabilities = await evaluator.capabilitiesFor({ userId: admin.id, companyId: company.id, active: true });
      expect(adminCapabilities).toContain(PROPOSAL_CAPABILITIES.QUALITY_REVIEW);
      expect(adminCapabilities).toContain(PROPOSAL_CAPABILITIES.EXECUTIVE_AUTHORIZE);

      await authority.transferFounder(evidence("transfer", successor.id), { retainOutgoingAdmin: false });
      expect(await authority.effectiveRole(company.id, founder.id)).toBe("MEMBER");
      expect(await authority.effectiveRole(company.id, successor.id)).toBe("FOUNDER");
      await authority.revokeAdmin({ ...evidence("revoke-admin", admin.id), actorUserId: successor.id, actorIdentity: successor.id });
      expect(await authority.effectiveRole(company.id, admin.id)).toBe("MEMBER");

      await transaction.applicationUser.update({ where: { id: successor.id }, data: { status: "INACTIVE" } });
      await expect(authority.effectiveRole(company.id, successor.id)).rejects.toMatchObject({ code: "ACTOR_INACTIVE" });

      const actors = createPrismaProposalActorContextProvider(transaction);
      expect(await actors.load({ id: admin.authUserId, email: admin.email })).toMatchObject({ userId: admin.id, companyId: company.id, active: true });
      expect(await actors.load({ id: "unknown", email: "unknown@example.com" })).toBeNull();
      expect(await actors.load({ id: successor.authUserId, email: successor.email })).toMatchObject({ active: false });

      const audit = await transaction.roleAdministrationAudit.findFirstOrThrow({ where: { companyId: company.id } });
      await expect(transaction.roleAdministrationAudit.update({ where: { id: audit.id }, data: { businessJustification: "mutated" } })).rejects.toThrow(/immutable/i);
      throw new RollbackMarker();
    }, { maxWait: 15_000, timeout: 30_000 })).rejects.toBeInstanceOf(RollbackMarker);
  }, 45_000);
});
