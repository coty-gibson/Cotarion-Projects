import type { ReactNode } from "react";
import { WorkspaceChrome } from "@/presentation/layouts/workspace-chrome";

export function AppShell({ children, userName }: { children: ReactNode; userName: string }) {
  return <WorkspaceChrome userName={userName}>{children}</WorkspaceChrome>;
}
