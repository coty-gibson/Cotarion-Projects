import { notFound } from "next/navigation";
import { updateClientAction } from "@/app/(protected)/clients/actions";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import { getClient } from "@/application/clients/client-service";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";
import { ClientForm } from "@/presentation/components/clients/client-form";

export default async function EditClientPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const user = await getCurrentApplicationUser();
  if (!user) return null;
  const { clientId } = await params;
  const client = await getClient(createPrismaClientRepository(), user.companyId, clientId);
  if (!client) notFound();
  const action = updateClientAction.bind(null, clientId);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-medium text-muted-foreground">{client.clientNumber}</p>
      <h2 className="mt-2 text-3xl font-semibold">Edit {client.name}</h2>
      <ClientForm action={action} client={client} />
    </div>
  );
}
