import type {
  ClientInput,
  ClientListFilters,
  ClientRecord,
  ClientRepository
} from "@/application/clients/client";
import { normalizeClientName } from "@/application/clients/client-validation";

export interface ClientMutationResult {
  client: ClientRecord | null;
  duplicate: ClientRecord | null;
}

export async function getClientDashboard(repository: ClientRepository, companyId: string) {
  const [count, recentClients] = await Promise.all([
    repository.countClients(companyId),
    repository.listRecentClients(companyId, 5)
  ]);
  return { count, recentClients };
}

export function listClients(
  repository: ClientRepository,
  companyId: string,
  filters: ClientListFilters
) {
  return repository.listClients(companyId, filters);
}

export function getClient(repository: ClientRepository, companyId: string, clientId: string) {
  return repository.findClient(companyId, clientId);
}

export async function createClient(
  repository: ClientRepository,
  companyId: string,
  ownerId: string,
  input: ClientInput,
  allowDuplicate = false
): Promise<ClientMutationResult> {
  const duplicate = await repository.findDuplicate(companyId, normalizeClientName(input.name));
  if (duplicate && !allowDuplicate) return { client: null, duplicate };
  return { client: await repository.createClient(companyId, ownerId, input), duplicate };
}

export async function updateClient(
  repository: ClientRepository,
  companyId: string,
  clientId: string,
  input: ClientInput,
  allowDuplicate = false
): Promise<ClientMutationResult> {
  const duplicate = await repository.findDuplicate(
    companyId,
    normalizeClientName(input.name),
    clientId
  );
  if (duplicate && !allowDuplicate) return { client: null, duplicate };
  return {
    client: await repository.updateClient(companyId, clientId, input),
    duplicate
  };
}
