export const VERSION_ONE_COMPANY = {
  name: "Cotarion Consulting Group",
  slug: "cotarion-consulting-group"
} as const;

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
}

export interface CompanyRepository {
  findCompanyBySlug(slug: string): Promise<CompanyRecord | null>;
  createCompany(input: typeof VERSION_ONE_COMPANY): Promise<CompanyRecord>;
}

export async function getOrCreateVersionOneCompany(
  repository: CompanyRepository
): Promise<CompanyRecord> {
  const existingCompany = await repository.findCompanyBySlug(VERSION_ONE_COMPANY.slug);

  if (existingCompany) {
    return existingCompany;
  }

  return repository.createCompany(VERSION_ONE_COMPANY);
}
