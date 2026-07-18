export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE_CLIENT", "INACTIVE"] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  PROSPECT: "Prospect",
  ACTIVE_CLIENT: "Active Client",
  INACTIVE: "Inactive"
};

export const CLIENT_BUSINESS_TYPES = [
  "ACCOUNTING",
  "ARCHITECTURE",
  "AUTOMOTIVE",
  "CONSTRUCTION",
  "CONSULTING",
  "EDUCATION",
  "FINANCIAL_SERVICES",
  "GOVERNMENT",
  "HEALTHCARE",
  "HOSPITALITY",
  "LEGAL",
  "MANUFACTURING",
  "NONPROFIT",
  "REAL_ESTATE",
  "RESTAURANT_FOOD_SERVICE",
  "RETAIL",
  "TECHNOLOGY",
  "TRANSPORTATION_LOGISTICS",
  "OTHER"
] as const;

export type ClientBusinessType = (typeof CLIENT_BUSINESS_TYPES)[number];

export const CLIENT_BUSINESS_TYPE_LABELS: Record<ClientBusinessType, string> = {
  ACCOUNTING: "Accounting",
  ARCHITECTURE: "Architecture",
  AUTOMOTIVE: "Automotive",
  CONSTRUCTION: "Construction",
  CONSULTING: "Consulting",
  EDUCATION: "Education",
  FINANCIAL_SERVICES: "Financial Services",
  GOVERNMENT: "Government",
  HEALTHCARE: "Healthcare",
  HOSPITALITY: "Hospitality",
  LEGAL: "Legal",
  MANUFACTURING: "Manufacturing",
  NONPROFIT: "Nonprofit",
  REAL_ESTATE: "Real Estate",
  RESTAURANT_FOOD_SERVICE: "Restaurant / Food Service",
  RETAIL: "Retail",
  TECHNOLOGY: "Technology",
  TRANSPORTATION_LOGISTICS: "Transportation / Logistics",
  OTHER: "Other"
};

export interface ClientContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface ClientRecord {
  id: string;
  clientNumber: string;
  companyId: string;
  ownerId: string;
  name: string;
  businessType: ClientBusinessType | null;
  imageUrl: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
  owner: { id: string; name: string | null; email: string };
  contacts: ClientContactRecord[];
}

export interface ClientInput {
  name: string;
  businessType: ClientBusinessType | null;
  imageUrl: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  notes: string | null;
  status: ClientStatus;
  contact: {
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface ClientListFilters {
  query?: string;
  status?: ClientStatus | "ALL";
}

export interface ClientRepository {
  countClients(companyId: string): Promise<number>;
  listRecentClients(companyId: string, limit: number): Promise<ClientRecord[]>;
  listClients(companyId: string, filters: ClientListFilters): Promise<ClientRecord[]>;
  findClient(companyId: string, clientId: string): Promise<ClientRecord | null>;
  findDuplicate(companyId: string, normalizedName: string, excludeId?: string): Promise<ClientRecord | null>;
  createClient(companyId: string, ownerId: string, input: ClientInput): Promise<ClientRecord>;
  updateClient(
    companyId: string,
    clientId: string,
    input: ClientInput
  ): Promise<ClientRecord | null>;
}
