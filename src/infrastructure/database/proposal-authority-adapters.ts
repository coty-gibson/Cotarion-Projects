import type { PrismaClient } from "@prisma/client";
import type {
  ProposalActorContextProvider,
  ProposalAuthorityProvider
} from "@/application/proposals/proposal-capabilities";
import { createPrismaCompanyAuthorityRepository } from "@/infrastructure/database/proposal-authority-repository";
import { prisma } from "@/infrastructure/database/prisma";

export function createPrismaProposalActorContextProvider(
  client: Pick<PrismaClient, "applicationUser"> = prisma
): ProposalActorContextProvider {
  return {
    async load(identity) {
      const user = await client.applicationUser.findUnique({
        where: { authUserId: identity.id },
        select: { id: true, companyId: true, status: true, email: true }
      });
      if (!user || user.email.toLowerCase() !== identity.email.toLowerCase()) return null;
      return { userId: user.id, companyId: user.companyId, active: user.status === "ACTIVE" };
    }
  };
}

export function createPrismaProposalAuthorityProvider(
  client: PrismaClient = prisma
): ProposalAuthorityProvider {
  const repository = createPrismaCompanyAuthorityRepository(client);
  return { roleFor: (actor) => repository.effectiveRole(actor.companyId, actor.userId) };
}
