import { AppShell } from "@/presentation/layouts/app-shell";
import { ShellScreen } from "@/presentation/screens/shell-screen";

export default function Home() {
  return (
    <AppShell>
      <ShellScreen />
    </AppShell>
  );
}
