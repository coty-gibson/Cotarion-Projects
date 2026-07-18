"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentApplicationUser } from "@/application/session/current-user";
import {
  createClient,
  updateClient
} from "@/application/clients/client-service";
import {
  type ClientFieldErrors,
  validateClientForm
} from "@/application/clients/client-validation";
import { createPrismaClientRepository } from "@/infrastructure/database/client-repository";

export interface ClientFormState {
  errors: ClientFieldErrors;
  message?: string;
  duplicate?: { id: string; name: string; clientNumber: string };
}

async function requireActiveUser() {
  const user = await getCurrentApplicationUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Authentication required.");
  return user;
}

export async function createClientAction(
  _previousState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const validation = validateClientForm(formData);
  if (!validation.input) return { errors: validation.errors, message: "Review the highlighted fields." };

  const user = await requireActiveUser();
  const result = await createClient(
    createPrismaClientRepository(),
    user.companyId,
    user.id,
    validation.input,
    formData.get("allowDuplicate") === "true"
  );

  if (!result.client && result.duplicate) {
    return {
      errors: {},
      message: "A client with the same normalized name already exists. Review it or create anyway.",
      duplicate: {
        id: result.duplicate.id,
        name: result.duplicate.name,
        clientNumber: result.duplicate.clientNumber
      }
    };
  }

  if (!result.client) return { errors: {}, message: "The client could not be created." };
  revalidatePath("/");
  revalidatePath("/clients");
  redirect(`/clients/${result.client.id}?created=1`);
}

export async function updateClientAction(
  clientId: string,
  _previousState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const validation = validateClientForm(formData);
  if (!validation.input) return { errors: validation.errors, message: "Review the highlighted fields." };

  const user = await requireActiveUser();
  const result = await updateClient(
    createPrismaClientRepository(),
    user.companyId,
    clientId,
    validation.input,
    formData.get("allowDuplicate") === "true"
  );

  if (!result.client && result.duplicate) {
    return {
      errors: {},
      message: "A client with the same normalized name already exists. Review it or save anyway.",
      duplicate: {
        id: result.duplicate.id,
        name: result.duplicate.name,
        clientNumber: result.duplicate.clientNumber
      }
    };
  }

  if (!result.client) return { errors: {}, message: "Client not found or unavailable." };
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?updated=1`);
}
