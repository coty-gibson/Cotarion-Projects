import type { CompanyRecord } from "@/application/companies/version-one-company";

export interface AuthenticatedIdentity {
  id: string;
  email: string;
  name?: string | null;
}

export interface ApplicationUserRecord {
  id: string;
  authUserId: string;
  companyId: string;
  email: string;
  name: string | null;
  status: "ACTIVE" | "INACTIVE";
  role: "MEMBER";
  company: CompanyRecord;
}

export interface ApplicationUserRepository {
  getOrCreateApplicationUserForIdentity(
    identity: AuthenticatedIdentity
  ): Promise<ApplicationUserRecord>;
}

export async function getOrCreateApplicationUserForIdentity(
  repository: ApplicationUserRepository,
  identity: AuthenticatedIdentity
): Promise<ApplicationUserRecord> {
  return repository.getOrCreateApplicationUserForIdentity(identity);
}
