import { describe, expect, it, vi } from "vitest";
import type {
  ClientInput,
  ClientRecord,
  ClientRepository
} from "@/application/clients/client";
import { createClient, getClientDashboard } from "@/application/clients/client-service";

const input: ClientInput = {
  name: "Acme Manufacturing",
  businessType: null,
  imageUrl: null,
  website: null,
  street: null,
  city: null,
  state: null,
  postalCode: null,
  notes: null,
  status: "PROSPECT",
  contact: null
};

const record = {
  id: "client-1",
  clientNumber: "CLI-000001",
  companyId: "company-1",
  ownerId: "owner-1",
  ...input,
  owner: { id: "owner-1", name: "Owner", email: "owner@example.com" },
  contacts: [],
  createdAt: new Date(),
  updatedAt: new Date()
} satisfies ClientRecord;

function repository(overrides: Partial<ClientRepository> = {}): ClientRepository {
  return {
    countClients: vi.fn().mockResolvedValue(0),
    listRecentClients: vi.fn().mockResolvedValue([]),
    listClients: vi.fn().mockResolvedValue([]),
    findClient: vi.fn().mockResolvedValue(null),
    findDuplicate: vi.fn().mockResolvedValue(null),
    createClient: vi.fn().mockResolvedValue(record),
    updateClient: vi.fn().mockResolvedValue(record),
    ...overrides
  };
}

describe("client application service", () => {
  it("builds the dashboard count and recent clients together", async () => {
    const clientRepository = repository({
      countClients: vi.fn().mockResolvedValue(1),
      listRecentClients: vi.fn().mockResolvedValue([record])
    });

    await expect(getClientDashboard(clientRepository, "company-1")).resolves.toEqual({
      count: 1,
      recentClients: [record]
    });
  });

  it("blocks an exact normalized duplicate until explicitly allowed", async () => {
    const clientRepository = repository({
      findDuplicate: vi.fn().mockResolvedValue(record)
    });

    const warning = await createClient(
      clientRepository,
      "company-1",
      "owner-1",
      { ...input, name: " ACME   MANUFACTURING " }
    );
    expect(warning).toEqual({ client: null, duplicate: record });
    expect(clientRepository.createClient).not.toHaveBeenCalled();

    const allowed = await createClient(
      clientRepository,
      "company-1",
      "owner-1",
      input,
      true
    );
    expect(allowed.client).toBe(record);
  });
});
