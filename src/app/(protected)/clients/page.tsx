import Link from "next/link";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS, type ClientStatus } from "@/application/clients/client";
import { listClients } from "@/application/clients/client-service";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import { Button } from "@/presentation/components/ui/button";
import { ClientStatusBadge } from "@/presentation/components/clients/client-status-badge";

export default async function ClientsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q : "";
  const rawStatus = typeof params?.status === "string" ? params.status : "ALL";
  const status =
    rawStatus === "ALL" || CLIENT_STATUSES.includes(rawStatus as ClientStatus)
      ? (rawStatus as ClientStatus | "ALL")
      : "ALL";
  const clients = await listClients(createPrismaClientRepository(), user.companyId, {
    query,
    status
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Company clients</p>
          <h2 className="mt-2 text-3xl font-semibold">Clients</h2>
        </div>
        <Button asChild>
          <Link href="/clients/new">Create client</Link>
        </Button>
      </div>

      <form className="mt-8 grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px_auto]">
        <label>
          <span className="sr-only">Search clients</span>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Search name, website, contact, email, or phone"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={status} name="status">
            <option value="ALL">All statuses</option>
            {CLIENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {CLIENT_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Search</Button>
      </form>

      {clients.length ? (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Primary contact</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const contact = client.contacts.find((item) => item.isPrimary);
                return (
                  <tr className="border-t hover:bg-muted/30" key={client.id}>
                    <td className="px-4 py-4">
                      <Link className="font-medium hover:underline" href={`/clients/${client.id}`}>
                        {client.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{client.clientNumber}</p>
                    </td>
                    <td className="px-4 py-4"><ClientStatusBadge status={client.status} /></td>
                    <td className="px-4 py-4">
                      {contact ? `${contact.firstName} ${contact.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-4">{client.owner.name ?? client.owner.email}</td>
                    <td className="px-4 py-4">{client.updatedAt.toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed p-10 text-center">
          <h3 className="text-lg font-semibold">{query || status !== "ALL" ? "No matching clients" : "No clients yet"}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {query || status !== "ALL"
              ? "Try adjusting your search or status filter."
              : "Create your first client to begin the company client workspace."}
          </p>
        </div>
      )}
    </div>
  );
}
