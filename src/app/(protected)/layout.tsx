import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentApplicationUser } from "@/application/session/current-user";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentApplicationUser();

  if (!currentUser) {
    redirect("/sign-in");
  }

  return children;
}
