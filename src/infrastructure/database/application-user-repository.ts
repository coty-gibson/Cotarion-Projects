import type { PrismaClient } from "@prisma/client";
import type {
  ApplicationUserRecord,
  ApplicationUserRepository,
  AuthenticatedIdentity
} from "@/application/users/application-user-profile";
import { VERSION_ONE_COMPANY } from "@/application/companies/version-one-company";
import { prisma } from "@/infrastructure/database/prisma";

export function createPrismaApplicationUserRepository(
  client: PrismaClient = prisma
): ApplicationUserRepository {
  return {
    async getOrCreateApplicationUserForIdentity(identity: AuthenticatedIdentity) {
      return client.$transaction(async (transaction) => {
        const authUser = await transaction.user.upsert({
          where: { id: identity.id },
          update: {
            email: identity.email,
            name: identity.name ?? null
          },
          create: {
            id: identity.id,
            email: identity.email,
            name: identity.name ?? null
          },
          select: { id: true }
        });

        const company = await transaction.company.upsert({
          where: { slug: VERSION_ONE_COMPANY.slug },
          update: { name: VERSION_ONE_COMPANY.name },
          create: VERSION_ONE_COMPANY,
          select: { id: true }
        });

        return transaction.applicationUser.upsert({
          where: { authUserId: authUser.id },
          update: {
            email: identity.email,
            name: identity.name ?? null,
            companyId: company.id
          },
          create: {
            authUserId: authUser.id,
            companyId: company.id,
            email: identity.email,
            name: identity.name ?? null,
            status: "ACTIVE",
            role: "MEMBER"
          },
          include: { company: { select: { id: true, name: true, slug: true } } }
        }) as Promise<ApplicationUserRecord>;
      });
    }
  };
}

export async function ensureVersionOneCompany(client: PrismaClient = prisma) {
  return client.company.upsert({
    where: { slug: VERSION_ONE_COMPANY.slug },
    update: { name: VERSION_ONE_COMPANY.name },
    create: VERSION_ONE_COMPANY,
    select: { id: true, name: true, slug: true }
  });
}
