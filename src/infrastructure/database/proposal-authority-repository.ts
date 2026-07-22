import type { Prisma, PrismaClient } from "@prisma/client";
import {
  AuthorityConfigurationError,
  type AuthorityCommandEvidence,
  type CompanyAuthorityRepository
} from "@/application/proposals/proposal-authority";
import { prisma } from "@/infrastructure/database/prisma";

function date(value: string) {
  const result = new Date(value);
  if (!Number.isFinite(result.getTime())) {
    throw new AuthorityConfigurationError("INVALID_EVIDENCE", "Authority timestamp is invalid.");
  }
  return result;
}

function justification(value: string) {
  const result = value.trim();
  if (!result) {
    throw new AuthorityConfigurationError("INVALID_EVIDENCE", "Business Justification is required.");
  }
  return result;
}

async function activeUser(transaction: Prisma.TransactionClient, companyId: string, userId: string) {
  const user = await transaction.applicationUser.findFirst({
    where: { id: userId, companyId, status: "ACTIVE" },
    select: { id: true }
  });
  if (!user) throw new AuthorityConfigurationError("ACTOR_INACTIVE", "Active Company user is required.");
}

function auditData(
  evidence: AuthorityCommandEvidence,
  action: Prisma.RoleAdministrationAuditCreateInput["action"],
  previousAuthority: string,
  resultingAuthority: string,
  administrationMethod: string
) {
  return {
    id: evidence.auditId,
    company: { connect: { id: evidence.companyId } },
    actorIdentity: evidence.actorIdentity,
    actorUserId: evidence.actorUserId ?? null,
    affectedUser: {
      connect: { id_companyId: { id: evidence.affectedUserId, companyId: evidence.companyId } }
    },
    action,
    businessJustification: justification(evidence.businessJustification),
    previousAuthority,
    resultingAuthority,
    administrationMethod,
    occurredAt: date(evidence.occurredAt),
    evidence: structuredClone(evidence.evidence) as Prisma.InputJsonValue
  } satisfies Prisma.RoleAdministrationAuditCreateInput;
}

async function requireFounder(
  transaction: Prisma.TransactionClient,
  companyId: string,
  actorUserId: string | undefined
) {
  if (!actorUserId) throw new AuthorityConfigurationError("CAPABILITY_DENIED", "Founder authority is required.");
  const seat = await transaction.companyFounderSeat.findUnique({ where: { companyId } });
  if (seat?.occupantUserId !== actorUserId) {
    throw new AuthorityConfigurationError("CAPABILITY_DENIED", "Current Founder authority is required.");
  }
  await activeUser(transaction, companyId, actorUserId);
  return seat;
}

export function createPrismaCompanyAuthorityRepository(
  client: PrismaClient = prisma
): CompanyAuthorityRepository {
  return {
    async effectiveRole(companyId, userId) {
      const user = await client.applicationUser.findFirst({
        where: { id: userId, companyId, status: "ACTIVE" },
        select: {
          id: true,
          founderSeat: { select: { companyId: true } },
          adminAssignments: {
            where: { effectiveTo: null },
            take: 1,
            select: { id: true }
          }
        }
      });
      if (!user) throw new AuthorityConfigurationError("ACTOR_INACTIVE", "Active Company user is required.");
      if (user.founderSeat) return "FOUNDER";
      if (user.adminAssignments.length) return "ADMIN";
      return "MEMBER";
    },

    async bootstrapNewCompanyFounder(evidence) {
      await client.$transaction(async (transaction) => {
        if (evidence.actorUserId !== evidence.affectedUserId) {
          throw new AuthorityConfigurationError("INVALID_EVIDENCE", "New Company Founder must be the identified Company creator.");
        }
        await activeUser(transaction, evidence.companyId, evidence.affectedUserId);
        const existing = await transaction.companyFounderSeat.findUnique({ where: { companyId: evidence.companyId } });
        if (existing?.occupantUserId === evidence.affectedUserId) {
          const audit = await transaction.roleAdministrationAudit.findUnique({ where: { id: evidence.auditId } });
          if (audit) return;
        }
        if (existing) throw new AuthorityConfigurationError("CONFLICTING_FOUNDER_SEAT", "Company Founder Seat already exists.");
        const occurredAt = date(evidence.occurredAt);
        await transaction.companyAdminAssignment.updateMany({
          where: { companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveTo: null },
          data: { effectiveTo: occurredAt }
        });
        await transaction.companyFounderSeat.create({
          data: { companyId: evidence.companyId, occupantUserId: evidence.affectedUserId, effectiveFrom: occurredAt }
        });
        await transaction.roleAdministrationAudit.create({
          data: auditData(evidence, "FOUNDER_BOOTSTRAPPED", "NONE", "FOUNDER", "NEW_COMPANY_BOOTSTRAP")
        });
      });
    },

    async recoverFounder(evidence) {
      await client.$transaction(async (transaction) => {
        await activeUser(transaction, evidence.companyId, evidence.affectedUserId);
        const seat = await transaction.companyFounderSeat.findUnique({
          where: { companyId: evidence.companyId },
          include: { occupant: { select: { status: true } } }
        });
        if (seat?.occupantUserId && seat.occupant?.status === "ACTIVE") {
          throw new AuthorityConfigurationError("CONFLICTING_FOUNDER_SEAT", "An active Founder already occupies the Company seat.");
        }
        const previous = seat?.occupantUserId ?? "NONE";
        await transaction.companyAdminAssignment.updateMany({
          where: { companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveTo: null },
          data: { effectiveTo: date(evidence.occurredAt) }
        });
        await transaction.companyFounderSeat.upsert({
          where: { companyId: evidence.companyId },
          create: { companyId: evidence.companyId, occupantUserId: evidence.affectedUserId, effectiveFrom: date(evidence.occurredAt) },
          update: { occupantUserId: evidence.affectedUserId, effectiveFrom: date(evidence.occurredAt) }
        });
        await transaction.roleAdministrationAudit.create({
          data: auditData(evidence, "FOUNDER_RECOVERED", previous, "FOUNDER", "RECOVERY")
        });
      });
    },

    async transferFounder(evidence, options) {
      await client.$transaction(async (transaction) => {
        const seat = await requireFounder(transaction, evidence.companyId, evidence.actorUserId);
        await activeUser(transaction, evidence.companyId, evidence.affectedUserId);
        if (seat.occupantUserId === evidence.affectedUserId) {
          throw new AuthorityConfigurationError("CONFLICTING_FOUNDER_SEAT", "Founder successor must be another user.");
        }
        await transaction.companyAdminAssignment.updateMany({
          where: { companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveTo: null },
          data: { effectiveTo: date(evidence.occurredAt) }
        });
        if (options.retainOutgoingAdmin) {
          await transaction.companyAdminAssignment.create({
            data: { id: crypto.randomUUID(), companyId: evidence.companyId, userId: seat.occupantUserId!, effectiveFrom: date(evidence.occurredAt) }
          });
        }
        await transaction.companyFounderSeat.update({
          where: { companyId: evidence.companyId },
          data: { occupantUserId: evidence.affectedUserId, effectiveFrom: date(evidence.occurredAt) }
        });
        await transaction.roleAdministrationAudit.create({
          data: auditData(evidence, "FOUNDER_TRANSFERRED", "MEMBER", "FOUNDER", "VOLUNTARY_TRANSFER")
        });
      });
    },

    async assignAdmin(evidence) {
      await client.$transaction(async (transaction) => {
        await requireFounder(transaction, evidence.companyId, evidence.actorUserId);
        await activeUser(transaction, evidence.companyId, evidence.affectedUserId);
        if (evidence.actorUserId === evidence.affectedUserId) {
          throw new AuthorityConfigurationError("CAPABILITY_DENIED", "Founder cannot assign Admin authority to the Founder Seat occupant.");
        }
        const existing = await transaction.companyAdminAssignment.findFirst({ where: { companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveTo: null } });
        if (!existing) await transaction.companyAdminAssignment.create({ data: { id: crypto.randomUUID(), companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveFrom: date(evidence.occurredAt) } });
        await transaction.roleAdministrationAudit.create({ data: auditData(evidence, "ADMIN_ASSIGNED", "MEMBER", "ADMIN", "ADMIN_ASSIGNMENT") });
      });
    },

    async revokeAdmin(evidence) {
      await client.$transaction(async (transaction) => {
        await requireFounder(transaction, evidence.companyId, evidence.actorUserId);
        const changed = await transaction.companyAdminAssignment.updateMany({ where: { companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveTo: null }, data: { effectiveTo: date(evidence.occurredAt) } });
        if (changed.count !== 1) throw new AuthorityConfigurationError("AUTHORITY_CONFIGURATION_MISSING", "Active Admin assignment was not found.");
        await transaction.roleAdministrationAudit.create({ data: auditData(evidence, "ADMIN_REVOKED", "ADMIN", "MEMBER", "ADMIN_REVOCATION") });
      });
    },

    async relinquishAdmin(evidence) {
      if (evidence.actorUserId !== evidence.affectedUserId) throw new AuthorityConfigurationError("CAPABILITY_DENIED", "Admin may relinquish only their own authority.");
      await client.$transaction(async (transaction) => {
        const changed = await transaction.companyAdminAssignment.updateMany({ where: { companyId: evidence.companyId, userId: evidence.affectedUserId, effectiveTo: null }, data: { effectiveTo: date(evidence.occurredAt) } });
        if (changed.count !== 1) throw new AuthorityConfigurationError("AUTHORITY_CONFIGURATION_MISSING", "Active Admin assignment was not found.");
        await transaction.roleAdministrationAudit.create({ data: auditData(evidence, "ADMIN_RELINQUISHED", "ADMIN", "MEMBER", "ADMIN_RELINQUISHMENT") });
      });
    }
  };
}

export function createCompanyAuthorityTransactionScope(
  transaction: Prisma.TransactionClient
): CompanyAuthorityRepository {
  const scopedClient = {
    applicationUser: transaction.applicationUser,
    $transaction: async <T>(work: (client: Prisma.TransactionClient) => Promise<T>) =>
      work(transaction)
  } as unknown as PrismaClient;
  return createPrismaCompanyAuthorityRepository(scopedClient);
}
