import { describe, expect, it } from "vitest";
import { VERSION_ONE_COMPANY } from "@/application/companies/version-one-company";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("Prisma application user repository", () => {
  it("keeps repeated and concurrent first sign-in mapping idempotent", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { createPrismaApplicationUserRepository } = await import(
      "@/infrastructure/database/application-user-repository"
    );
    const repository = createPrismaApplicationUserRepository(prisma);
    const identity: AuthenticatedIdentity = {
      id: "test-auth-user-concurrent",
      email: "test-auth-user-concurrent@cotarion.local",
      name: "Concurrent Test User"
    };

    await prisma.applicationUser.deleteMany({ where: { authUserId: identity.id } });
    await prisma.user.deleteMany({ where: { id: identity.id } });

    const mappings = await Promise.all([
      repository.getOrCreateApplicationUserForIdentity(identity),
      repository.getOrCreateApplicationUserForIdentity(identity),
      repository.getOrCreateApplicationUserForIdentity(identity),
      repository.getOrCreateApplicationUserForIdentity(identity),
      repository.getOrCreateApplicationUserForIdentity(identity)
    ]);

    const repeatedMapping = await repository.getOrCreateApplicationUserForIdentity(identity);

    expect(new Set([...mappings, repeatedMapping].map((mapping) => mapping.id)).size).toBe(1);
    expect(await prisma.user.count({ where: { id: identity.id } })).toBe(1);
    expect(await prisma.applicationUser.count({ where: { authUserId: identity.id } })).toBe(1);
    expect(await prisma.company.count({ where: { slug: VERSION_ONE_COMPANY.slug } })).toBe(1);

    await prisma.applicationUser.deleteMany({ where: { authUserId: identity.id } });
    await prisma.user.deleteMany({ where: { id: identity.id } });
  });
});
