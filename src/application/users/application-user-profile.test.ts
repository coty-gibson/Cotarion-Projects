import { describe, expect, it } from "vitest";
import {
  getOrCreateApplicationUserForIdentity,
  type ApplicationUserRecord,
  type ApplicationUserRepository,
  type AuthenticatedIdentity
} from "@/application/users/application-user-profile";
import { VERSION_ONE_COMPANY } from "@/application/companies/version-one-company";

function createRepository(): ApplicationUserRepository & {
  applicationUsers: ApplicationUserRecord[];
  authUsers: AuthenticatedIdentity[];
  companies: Array<{ id: string; name: string; slug: string }>;
} {
  const companies: Array<{ id: string; name: string; slug: string }> = [];
  const applicationUsers: ApplicationUserRecord[] = [];
  const authUsers: AuthenticatedIdentity[] = [];

  return {
    applicationUsers,
    authUsers,
    companies,
    async getOrCreateApplicationUserForIdentity(identity) {
      const existingUser = authUsers.find((user) => user.id === identity.id);

      if (existingUser) {
        existingUser.email = identity.email;
        existingUser.name = identity.name;
      } else {
        authUsers.push({ ...identity });
      }

      let company = companies.find((candidateCompany) => candidateCompany.slug === VERSION_ONE_COMPANY.slug);

      if (!company) {
        company = {
          id: "company-1",
          ...VERSION_ONE_COMPANY
        };
        companies.push(company);
      }

      const existingApplicationUser = applicationUsers.find(
        (user) => user.authUserId === identity.id
      );

      if (existingApplicationUser) {
        existingApplicationUser.email = identity.email;
        existingApplicationUser.name = identity.name ?? null;
        existingApplicationUser.companyId = company.id;
        existingApplicationUser.company = company;

        return existingApplicationUser;
      }

      const applicationUser: ApplicationUserRecord = {
        id: `application-user-${applicationUsers.length + 1}`,
        authUserId: identity.id,
        companyId: company.id,
        email: identity.email,
        name: identity.name ?? null,
        status: "ACTIVE",
        role: "MEMBER",
        company
      };

      applicationUsers.push(applicationUser);

      return applicationUser;
    }
  };
}

describe("application user profile mapping", () => {
  it("creates one application user for an authenticated identity", async () => {
    const repository = createRepository();

    const applicationUser = await getOrCreateApplicationUserForIdentity(repository, {
      id: "auth-user-1",
      email: "person@example.com",
      name: "Person Example"
    });

    expect(applicationUser.authUserId).toBe("auth-user-1");
    expect(applicationUser.email).toBe("person@example.com");
    expect(applicationUser.company.slug).toBe(VERSION_ONE_COMPANY.slug);
    expect(repository.applicationUsers).toHaveLength(1);
  });

  it("returns the existing application user on repeated mapping", async () => {
    const repository = createRepository();
    const identity = {
      id: "auth-user-1",
      email: "person@example.com",
      name: "Person Example"
    };

    const firstMapping = await getOrCreateApplicationUserForIdentity(repository, identity);
    const secondMapping = await getOrCreateApplicationUserForIdentity(repository, identity);

    expect(secondMapping.id).toBe(firstMapping.id);
    expect(repository.applicationUsers).toHaveLength(1);
  });

  it("keeps concurrent first sign-in mapping idempotent", async () => {
    const repository = createRepository();
    const identity = {
      id: "auth-user-1",
      email: "person@example.com",
      name: "Person Example"
    };

    const mappings = await Promise.all([
      getOrCreateApplicationUserForIdentity(repository, identity),
      getOrCreateApplicationUserForIdentity(repository, identity),
      getOrCreateApplicationUserForIdentity(repository, identity)
    ]);

    expect(new Set(mappings.map((mapping) => mapping.id))).toEqual(
      new Set(["application-user-1"])
    );
    expect(repository.applicationUsers).toHaveLength(1);
    expect(repository.authUsers).toHaveLength(1);
    expect(repository.companies).toHaveLength(1);
  });
});
