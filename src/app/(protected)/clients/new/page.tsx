import { createClientAction } from "@/app/(protected)/clients/actions";
import { ClientForm } from "@/presentation/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-medium text-muted-foreground">Clients</p>
      <h2 className="mt-2 text-3xl font-semibold">Create client</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The client ID and owner are assigned automatically.
      </p>
      <ClientForm action={createClientAction} />
    </div>
  );
}
