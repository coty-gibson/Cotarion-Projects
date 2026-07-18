import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ClientInput,
  ClientListFilters,
  ClientRecord,
  ClientRepository
} from "@/application/clients/client";
import { normalizeClientName } from "@/application/clients/client-validation";
import { prisma } from "@/infrastructure/database/prisma";

const clientInclude = {
  owner: { select: { id: true, name: true, email: true } },
  contacts: { orderBy: { createdAt: "asc" as const } }
};

function formatClientNumber(value: number) {
  return `CLI-${value.toString().padStart(6, "0")}`;
}

function contactCreate(input: ClientInput) {
  return input.contact
    ? {
        create: {
          ...input.contact,
          isPrimary: true
        }
      }
    : undefined;
}

function clientData(input: ClientInput) {
  return {
    name: input.name,
    normalizedName: normalizeClientName(input.name),
    businessType: input.businessType,
    imageUrl: input.imageUrl,
    website: input.website,
    street: input.street,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    notes: input.notes,
    status: input.status
  };
}

export function createPrismaClientRepository(client: PrismaClient = prisma): ClientRepository {
  return {
    async countClients(companyId) {
      return client.client.count({ where: { companyId } });
    },

    async listRecentClients(companyId, limit) {
      return client.client.findMany({
        where: { companyId },
        include: clientInclude,
        orderBy: { createdAt: "desc" },
        take: limit
      }) as Promise<ClientRecord[]>;
    },

    async listClients(companyId, filters: ClientListFilters) {
      const query = filters.query?.trim();
      const where: Prisma.ClientWhereInput = {
        companyId,
        ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { website: { contains: query, mode: "insensitive" } },
                {
                  contacts: {
                    some: {
                      OR: [
                        { firstName: { contains: query, mode: "insensitive" } },
                        { lastName: { contains: query, mode: "insensitive" } },
                        { email: { contains: query, mode: "insensitive" } },
                        { phone: { contains: query, mode: "insensitive" } }
                      ]
                    }
                  }
                }
              ]
            }
          : {})
      };

      return client.client.findMany({
        where,
        include: clientInclude,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        take: 100
      }) as Promise<ClientRecord[]>;
    },

    async findClient(companyId, clientId) {
      return client.client.findFirst({
        where: { id: clientId, companyId },
        include: clientInclude
      }) as Promise<ClientRecord | null>;
    },

    async findDuplicate(companyId, normalizedName, excludeId) {
      return client.client.findFirst({
        where: {
          companyId,
          normalizedName,
          ...(excludeId ? { id: { not: excludeId } } : {})
        },
        include: clientInclude
      }) as Promise<ClientRecord | null>;
    },

    async createClient(companyId, ownerId, input) {
      return client.$transaction(async (transaction) => {
        const sequence = await transaction.clientSequence.upsert({
          where: { companyId },
          create: { companyId, lastValue: 1 },
          update: { lastValue: { increment: 1 } },
          select: { lastValue: true }
        });

        return transaction.client.create({
          data: {
            ...clientData(input),
            clientNumber: formatClientNumber(sequence.lastValue),
            company: { connect: { id: companyId } },
            owner: { connect: { id: ownerId } },
            contacts: contactCreate(input)
          },
          include: clientInclude
        }) as Promise<ClientRecord>;
      });
    },

    async updateClient(companyId, clientId, input) {
      return client.$transaction(async (transaction) => {
        const existing = await transaction.client.findFirst({
          where: { id: clientId, companyId },
          select: { id: true }
        });
        if (!existing) return null;

        await transaction.clientContact.deleteMany({ where: { clientId } });
        return transaction.client.update({
          where: { id: clientId },
          data: {
            ...clientData(input),
            contacts: contactCreate(input)
          },
          include: clientInclude
        }) as Promise<ClientRecord>;
      });
    }
  };
}
