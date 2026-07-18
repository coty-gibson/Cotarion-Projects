import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { AppShell } from "@/presentation/layouts/app-shell";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentApplicationUser();

  if (!currentUser || currentUser.status !== "ACTIVE") {
    redirect("/sign-in");
  }

  return <AppShell userName={currentUser.name ?? currentUser.email}>{children}</AppShell>;
}
