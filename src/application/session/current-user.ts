import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/auth-options";
import { createPrismaApplicationUserRepository } from "@/infrastructure/database/application-user-repository";
import { getOrCreateApplicationUserForIdentity } from "@/application/users/application-user-profile";
import { getAuthenticatedIdentityFromSession } from "@/application/session/authenticated-identity";

export async function getCurrentApplicationUser() {
  const session = await getServerSession(authOptions);
  const identity = getAuthenticatedIdentityFromSession(session);

  if (!identity) {
    return null;
  }

  return getOrCreateApplicationUserForIdentity(createPrismaApplicationUserRepository(), identity);
}
