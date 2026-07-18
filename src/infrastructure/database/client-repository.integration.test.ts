import { describe, expect, it } from "vitest";
import type { ClientInput } from "@/application/clients/client";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("Prisma client repository", () => {
  it("creates immutable sequential IDs and enforces company-scoped reads and search", async () => {
    const { prisma } = await import("@/infrastructure/database/prisma");
    const { createPrismaApplicationUserRepository } = await import(
      "@/infrastructure/database/application-user-repository"
    );
    const { createPrismaClientRepository } = await import(
      "@/infrastructure/database/client-repository"
    );
    const identity: AuthenticatedIdentity = {
      id: "test-client-owner",
      email: "test-client-owner@cotarion.local",
      name: "Client Test Owner"
    };
    const userRepository = createPrismaApplicationUserRepository(prisma);
    const applicationUser = await userRepository.getOrCreateApplicationUserForIdentity(identity);
    const clientRepository = createPrismaClientRepository(prisma);
    const input: ClientInput = {
      name: "Client Repository Test",
      businessType: "OTHER",
      imageUrl: null,
      website: "https://repository-test.example",
      street: "100 Test Street",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      notes: "Relationship notes",
      status: "PROSPECT",
      contact: {
        firstName: "Test",
        lastName: "Contact",
        jobTitle: null,
        email: "contact@repository-test.example",
        phone: "+1 312 555 0199"
      }
    };

    await prisma.client.deleteMany({ where: { ownerId: applicationUser.id } });
    const [first, second] = await Promise.all([
      clientRepository.createClient(applicationUser.companyId, applicationUser.id, input),
      clientRepository.createClient(applicationUser.companyId, applicationUser.id, {
        ...input,
        name: "Second Client Repository Test"
      })
    ]);

    expect(first.clientNumber).toMatch(/^CLI-\d{6,}$/);
    expect(second.clientNumber).toMatch(/^CLI-\d{6,}$/);
    expect(first.clientNumber).not.toBe(second.clientNumber);
    expect(
      await clientRepository.findClient("another-company", first.id)
    ).toBeNull();
    expect(
      await clientRepository.listClients(applicationUser.companyId, { query: "555 0199" })
    ).toHaveLength(2);

    const originalNumber = first.clientNumber;
    const updated = await clientRepository.updateClient(applicationUser.companyId, first.id, {
      ...input,
      name: "Updated Client Repository Test",
      status: "ACTIVE_CLIENT"
    });
    expect(updated?.clientNumber).toBe(originalNumber);
    expect(updated?.status).toBe("ACTIVE_CLIENT");

    await prisma.client.deleteMany({ where: { ownerId: applicationUser.id } });
    await prisma.applicationUser.deleteMany({ where: { authUserId: identity.id } });
    await prisma.user.deleteMany({ where: { id: identity.id } });
  });
});
