import type { Session } from "next-auth";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";

export function getAuthenticatedIdentityFromSession(
  session: Session | null
): AuthenticatedIdentity | null {
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  };
}
