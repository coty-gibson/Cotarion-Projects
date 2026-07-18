import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { CLIENT_BUSINESS_TYPE_LABELS } from "@/application/clients/client";
import { getClient } from "@/application/clients/client-service";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import { Button } from "@/presentation/components/ui/button";
import { ClientStatusBadge } from "@/presentation/components/clients/client-status-badge";

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  const { clientId } = await params;
  const client = await getClient(createPrismaClientRepository(), user.companyId, clientId);
  if (!client) notFound();
  const query = await searchParams;
  const contact = client.contacts.find((item) => item.isPrimary);
  const address = [client.street, client.city, client.state, client.postalCode].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-5xl">
      {query?.created === "1" || query?.updated === "1" ? (
        <p className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Client {query.created === "1" ? "created" : "updated"} successfully.
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {client.imageUrl ? (
            <div
              aria-label={`${client.name} logo`}
              className="h-16 w-16 rounded-lg border bg-contain bg-center bg-no-repeat"
              role="img"
              style={{ backgroundImage: `url("${client.imageUrl.replaceAll('"', "%22")}")` }}
            />
          ) : null}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{client.clientNumber}</p>
            <h2 className="mt-2 text-3xl font-semibold">{client.name}</h2>
            <div className="mt-3"><ClientStatusBadge status={client.status} /></div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/clients/${client.id}/edit`}>Edit client</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Client information</h3>
          <dl className="mt-5 grid gap-5">
            <Detail
              label="Industry"
              value={
                client.businessType ? CLIENT_BUSINESS_TYPE_LABELS[client.businessType] : null
              }
            />
            <Detail label="Website" value={client.website} />
            <Detail label="Business address" value={address} />
            <Detail label="Owner" value={client.owner.name ?? client.owner.email} />
          </dl>
        </section>
        <section className="rounded-lg border p-6">
          <h3 className="text-lg font-semibold">Primary contact</h3>
          <dl className="mt-5 grid gap-5">
            <Detail label="Name" value={contact ? `${contact.firstName} ${contact.lastName}` : null} />
            <Detail label="Job title" value={contact?.jobTitle} />
            <Detail label="Email" value={contact?.email} />
            <Detail label="Phone number" value={contact?.phone} />
          </dl>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-6">
        <h3 className="text-lg font-semibold">Relationship notes</h3>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{client.notes || "No notes added."}</p>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Created {client.createdAt.toLocaleString()} · Updated {client.updatedAt.toLocaleString()}
      </p>
    </div>
  );
}
