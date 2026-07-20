import Link from "next/link";
import type { ClientRecord } from "@/application/clients/client";
import { Button } from "@/presentation/components/ui/button";
import { ClientStatusBadge } from "@/presentation/components/clients/client-status-badge";

export function ClientDashboardScreen({
  count,
  recentClients
}: {
  count: number;
  recentClients: ClientRecord[];
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Clients foundation</p>
          <h2 className="mt-2 text-3xl font-semibold">Dashboard</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/clients/new">Create Client</Link>
          </Button>
          <Button asChild>
            <Link href="/pricing-projects/new">New Pricing Project</Link>
          </Button>
        </div>
      </div>

      <section className="mt-8 rounded-lg border bg-background p-6">
        <p className="text-sm font-medium text-muted-foreground">Total clients</p>
        <p className="mt-2 text-4xl font-semibold">{count}</p>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Recent Clients</h3>
          {count > 0 ? (
            <Link
              className="text-sm font-medium underline-offset-4 hover:underline"
              href="/clients"
            >
              View all
            </Link>
          ) : null}
        </div>
        {recentClients.length ? (
          <div className="mt-4 overflow-hidden rounded-lg border">
            {recentClients.map((client) => (
              <Link
                className="flex items-center justify-between gap-4 border-b px-5 py-4 last:border-b-0 hover:bg-muted/40"
                href={`/clients/${client.id}`}
                key={client.id}
              >
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{client.clientNumber}</p>
                </div>
                <ClientStatusBadge status={client.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed p-10 text-center">
            <h3 className="text-lg font-semibold">Create your first client</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Add a client organization and primary contact to begin building your client workspace.
            </p>
            <Button asChild className="mt-5">
              <Link href="/clients/new">Create client</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
