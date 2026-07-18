import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/presentation/components/auth/sign-out-button";

const navigationItems = [
  { label: "Dashboard", href: "/" },
  { label: "Clients", href: "/clients" }
];

const comingSoonItems = [
  "Pricing",
  "Proposals",
  "Agreements",
  "Engagements",
  "Services & Pricing",
  "Templates",
  "Admin"
];

export function AppShell({
  children,
  userName
}: {
  children: ReactNode;
  userName: string;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 border-r bg-muted/30 px-6 py-8 lg:block">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cotarion Platform</p>
            <h1 className="mt-2 text-2xl font-semibold">Pricing & Proposals</h1>
          </div>
          <nav aria-label="Primary" className="mt-10 space-y-1">
            {navigationItems.map((item) => (
              <Link
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
            {comingSoonItems.map((item) => (
              <div
                aria-disabled="true"
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                key={item}
              >
                <span>{item}</span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  Coming Soon
                </span>
              </div>
            ))}
          </nav>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b px-6 py-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cotarion Consulting Group</p>
              <p className="mt-1 text-lg font-semibold">{userName}</p>
            </div>
            <SignOutButton />
          </header>
          <div className="flex-1 px-6 py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
