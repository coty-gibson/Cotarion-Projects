import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClientInput } from "@/application/clients/client";
import type { AuthenticatedIdentity } from "@/application/users/application-user-profile";
import { INITIAL_PRICING_CONFIGURATION, INITIAL_PROJECT_SERVICES } from "@/domain/pricing";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("Pricing persistence", () => {
  let prisma: PrismaClient;
  let companyId: string;
  let ownerId: string;
  let clientId: string;
  let configurationVersionId: string;
  let serviceCatalogItemId: string;
  let initialProjectCount: number;
  let initialSequenceValue: bigint | null;

  const identity: AuthenticatedIdentity = {
    id: "test-pricing-persistence-owner",
    email: "test-pricing-persistence-owner@cotarion.local",
    name: "Pricing Persistence Test Owner"
  };

  const clientInput: ClientInput = {
    name: "Pricing Persistence Test Client",
    businessType: "CONSULTING",
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

  beforeAll(async () => {
    ({ prisma } = await import("@/infrastructure/database/prisma"));
    const { createPrismaApplicationUserRepository } =
      await import("@/infrastructure/database/application-user-repository");
    const { createPrismaClientRepository } =
      await import("@/infrastructure/database/client-repository");
    const { seedPricingFoundation } = await import("@/infrastructure/database/pricing-seed");

    const applicationUser =
      await createPrismaApplicationUserRepository(prisma).getOrCreateApplicationUserForIdentity(
        identity
      );
    companyId = applicationUser.companyId;
    ownerId = applicationUser.id;

    await prisma.pricingProject.deleteMany({ where: { ownerId } });
    await prisma.client.deleteMany({ where: { ownerId } });
    initialProjectCount = await prisma.pricingProject.count();
    initialSequenceValue =
      (
        await prisma.pricingProjectSequence.findUnique({
          where: { id: "global" },
          select: { lastValue: true }
        })
      )?.lastValue ?? null;

    const client = await createPrismaClientRepository(prisma).createClient(
      companyId,
      ownerId,
      clientInput
    );
    clientId = client.id;

    const seed = await seedPricingFoundation(companyId, prisma);
    configurationVersionId = seed.pricingConfigurationVersionId;
    serviceCatalogItemId = (
      await prisma.serviceCatalogItem.findUniqueOrThrow({
        where: {
          companyId_code: {
            companyId,
            code: "svc-business-strategy-session"
          }
        }
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.pricingProject.deleteMany({ where: { ownerId } });
    await prisma.client.deleteMany({ where: { ownerId } });
    await prisma.applicationUser.deleteMany({ where: { authUserId: identity.id } });
    await prisma.user.deleteMany({ where: { id: identity.id } });

    if ((await prisma.pricingProject.count()) === initialProjectCount) {
      if (initialSequenceValue === null) {
        await prisma.pricingProjectSequence.deleteMany({ where: { id: "global" } });
      } else {
        await prisma.pricingProjectSequence.update({
          where: { id: "global" },
          data: { lastValue: initialSequenceValue }
        });
      }
    }
  });

  function draft(projectName: string, quantity = "1.00") {
    return {
      clientId,
      ownerId,
      pricingConfigurationVersionId: configurationVersionId,
      projectName,
      lines: [{ serviceCatalogItemId, quantity, sortOrder: 1 }],
      complexitySelections: INITIAL_PRICING_CONFIGURATION.complexityFactors.map(
        (factor, index) => ({
          factorCode: factor.id,
          optionCode: factor.options.find(({ standard }) => standard)!.id,
          sortOrder: index + 1
        })
      ),
      discountSelection: { discountCode: "none", sortOrder: 1 }
    };
  }

  it("seeds the exact approved catalog and immutable configuration idempotently", async () => {
    const { seedPricingFoundation } = await import("@/infrastructure/database/pricing-seed");
    const firstIds = new Map(
      (
        await prisma.serviceCatalogItem.findMany({
          where: { companyId },
          orderBy: { sortOrder: "asc" }
        })
      ).map((service) => [service.code, service.id])
    );

    const repeated = await seedPricingFoundation(companyId, prisma);
    const services = await prisma.serviceCatalogItem.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" }
    });
    const version = await prisma.pricingConfigurationVersion.findUniqueOrThrow({
      where: { id: repeated.pricingConfigurationVersionId }
    });
    const snapshot = version.configuration as {
      services: { id: string; name: string; unitPrice: string }[];
      complexityFactors: unknown[];
      discounts: unknown[];
      roundingMode: string;
      schemaVersion: number;
    };

    expect(repeated.serviceCount).toBe(29);
    expect(services).toHaveLength(29);
    expect(
      services.every(({ status, currency }) => status === "ACTIVE" && currency === "USD")
    ).toBe(true);
    expect(services.map(({ code, name, basePriceMinor }) => [code, name, basePriceMinor])).toEqual(
      INITIAL_PROJECT_SERVICES.map(({ id, name, unitPrice }) => [
        id,
        name,
        unitPrice.toMinorUnits()
      ])
    );
    expect(services.every((service) => firstIds.get(service.code) === service.id)).toBe(true);
    expect(snapshot.services).toHaveLength(29);
    expect(snapshot.complexityFactors).toHaveLength(6);
    expect(snapshot.discounts).toHaveLength(4);
    expect(snapshot.roundingMode).toBe("HALF_AWAY_FROM_ZERO");
    expect(snapshot.schemaVersion).toBe(INITIAL_PRICING_CONFIGURATION.schemaVersion);
    expect(version.schemaVersion).toBe(INITIAL_PRICING_CONFIGURATION.schemaVersion);
    expect(version.engineVersion).toBe("pricing-engine/2.0.0");
  });

  it("fails on Service Catalog baseline drift without silently overwriting it", async () => {
    const { seedPricingFoundation } = await import("@/infrastructure/database/pricing-seed");
    const original = await prisma.serviceCatalogItem.findUniqueOrThrow({
      where: { id: serviceCatalogItemId }
    });
    const driftedName = `${original.name} - drift test`;

    await prisma.serviceCatalogItem.update({
      where: { id: serviceCatalogItemId },
      data: { name: driftedName }
    });
    try {
      await expect(seedPricingFoundation(companyId, prisma)).rejects.toThrow(
        /differs from the approved baseline/i
      );
      expect(
        (
          await prisma.serviceCatalogItem.findUniqueOrThrow({
            where: { id: serviceCatalogItemId }
          })
        ).name
      ).toBe(driftedName);
    } finally {
      await prisma.serviceCatalogItem.update({
        where: { id: serviceCatalogItemId },
        data: { name: original.name }
      });
    }
  });

  it("persists a company-scoped Pricing Project and exact decimal quantity", async () => {
    const { createPrismaPricingProjectRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingProjectRepository(prisma);
    const created = await repository.createPricingProject(
      companyId,
      draft("Operational Foundation", "1.25")
    );

    expect(created.estimateNumber).toMatch(/^EST-\d{6,}$/);
    expect(created.status).toBe("DRAFT");
    expect(created.currency).toBe("USD");
    expect(created.companyId).toBe(companyId);
    expect(created.clientId).toBe(clientId);
    expect(created.ownerId).toBe(ownerId);
    expect(created.pricingConfigurationVersionId).toBe(configurationVersionId);
    expect(created.lines).toHaveLength(1);
    expect(created.lines[0].quantity).toBe("1.25");
    expect(created.lines[0].basePriceMinor).toBe(BigInt(25000));
    expect(created.complexitySelections).toHaveLength(6);
    expect(created.discountSelection?.discountCode).toBe("none");
    expect(await repository.findPricingProject("another-company", created.id)).toBeNull();
    expect(await repository.listPricingProjectsForClient(companyId, clientId)).toContainEqual(
      created
    );
  });

  it("round-trips two-decimal quantities and integer money without floating-point loss", async () => {
    const { createPrismaPricingProjectRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingProjectRepository(prisma);
    const highestPriceService = await prisma.serviceCatalogItem.findUniqueOrThrow({
      where: {
        companyId_code: {
          companyId,
          code: "svc-operations-optimization-package"
        }
      }
    });
    const created = await repository.createPricingProject(companyId, {
      ...draft("Precision Round Trip", "0.01"),
      lines: [
        { serviceCatalogItemId, quantity: "0.01", sortOrder: 1 },
        {
          serviceCatalogItemId: highestPriceService.id,
          quantity: "999999999999.99",
          sortOrder: 2
        }
      ]
    });
    const persisted = await repository.findPricingProject(companyId, created.id);

    expect(persisted?.lines.map(({ quantity }) => quantity)).toEqual(["0.01", "999999999999.99"]);
    expect(persisted?.lines.map(({ basePriceMinor }) => basePriceMinor)).toEqual([
      BigInt(25000),
      BigInt(650000)
    ]);
    expect(typeof persisted?.lines[0].basePriceMinor).toBe("bigint");
  });

  it("supports repository create, read, draft update, status change, and Client listing", async () => {
    const { createPrismaPricingProjectRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingProjectRepository(prisma);
    const created = await repository.createPricingProject(companyId, draft("Repository Lifecycle"));
    const originalEstimate = created.estimateNumber;
    const updated = await repository.replacePricingProjectDraft(companyId, created.id, {
      projectName: "Repository Lifecycle Updated",
      lines: [
        { serviceCatalogItemId, quantity: "0.33", sortOrder: 1 },
        { serviceCatalogItemId, quantity: "2.50", sortOrder: 2 }
      ],
      complexitySelections: draft("unused").complexitySelections.map((selection, index) =>
        index === 0 ? { ...selection, optionCode: "business-size-6-15" } : selection
      ),
      discountSelection: { discountCode: "nonprofit", sortOrder: 1 }
    });

    expect(updated?.estimateNumber).toBe(originalEstimate);
    expect(updated?.pricingConfigurationVersionId).toBe(configurationVersionId);
    expect(updated?.projectName).toBe("Repository Lifecycle Updated");
    expect(updated?.lines.map(({ quantity }) => quantity)).toEqual(["0.33", "2.50"]);
    expect(updated?.complexitySelections[0].optionCode).toBe("business-size-6-15");
    expect(updated?.discountSelection?.discountCode).toBe("nonprofit");

    for (const status of ["IN_REVIEW", "QUOTED", "ARCHIVED"] as const) {
      expect(
        (await repository.updatePricingProjectStatus(companyId, created.id, status))?.status
      ).toBe(status);
    }
    expect((await repository.findPricingProject(companyId, created.id))?.estimateNumber).toBe(
      originalEstimate
    );
    expect(
      (await repository.listPricingProjectsForClient(companyId, clientId)).some(
        ({ id }) => id === created.id
      )
    ).toBe(true);
  });

  it("allocates collision-free monotonically increasing estimate numbers concurrently", async () => {
    const { createPrismaPricingProjectRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingProjectRepository(prisma);
    const projects = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        repository.createPricingProject(companyId, draft(`Concurrent Project ${index + 1}`))
      )
    );
    const numbers = projects.map(({ estimateNumber }) => estimateNumber);
    const values = numbers
      .map((number) => BigInt(number.replace("EST-", "")))
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

    expect(new Set(numbers).size).toBe(12);
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index] - values[index - 1]).toBe(BigInt(1));
    }
  }, 30_000);

  it("rejects cross-Company Clients, owners, configurations, and services", async () => {
    const { createPrismaPricingProjectRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingProjectRepository(prisma);
    const suffix = Date.now().toString();
    const otherCompany = await prisma.company.create({
      data: { name: "Other Pricing Test Company", slug: `other-pricing-test-${suffix}` }
    });
    const otherAuthUser = await prisma.user.create({
      data: {
        id: `other-pricing-auth-${suffix}`,
        email: `other-pricing-${suffix}@cotarion.local`
      }
    });
    const otherOwner = await prisma.applicationUser.create({
      data: {
        authUserId: otherAuthUser.id,
        companyId: otherCompany.id,
        email: `other-pricing-${suffix}@cotarion.local`
      }
    });
    const otherClient = await prisma.client.create({
      data: {
        clientNumber: `CLI-OTHER-${suffix}`,
        companyId: otherCompany.id,
        ownerId: otherOwner.id,
        name: "Other Company Client",
        normalizedName: "other company client"
      }
    });
    const otherService = await prisma.serviceCatalogItem.create({
      data: {
        companyId: otherCompany.id,
        code: `other-service-${suffix}`,
        name: "Other Company Service",
        basePriceMinor: BigInt(10000),
        currency: "USD",
        status: "ACTIVE",
        sortOrder: 1
      }
    });

    try {
      await expect(
        repository.createPricingProject(companyId, {
          ...draft("Invalid Cross-Company Project"),
          clientId: otherClient.id
        })
      ).rejects.toThrow();
      await expect(
        repository.createPricingProject(companyId, {
          ...draft("Invalid Cross-Company Owner"),
          ownerId: otherOwner.id
        })
      ).rejects.toThrow();

      const validProject = await repository.createPricingProject(
        companyId,
        draft("Cross-Company Service Constraint")
      );
      await expect(
        prisma.pricingProjectLine.create({
          data: {
            companyId,
            pricingProjectId: validProject.id,
            serviceCatalogItemId: otherService.id,
            quantity: "1.00",
            sortOrder: 2
          }
        })
      ).rejects.toThrow();

      await expect(
        prisma.$transaction(async (transaction) => {
          const isolatedCompany = await transaction.company.create({
            data: {
              name: "Configuration Isolation Test",
              slug: `configuration-isolation-${suffix}`
            }
          });
          const configuration = await transaction.pricingConfiguration.create({
            data: { companyId: isolatedCompany.id }
          });
          const version = await transaction.pricingConfigurationVersion.create({
            data: {
              pricingConfigurationId: configuration.id,
              companyId: isolatedCompany.id,
              version: 1,
              status: "ACTIVE",
              schemaVersion: 1,
              engineVersion: "isolation-test",
              currency: "USD",
              configuration: {},
              effectiveFrom: new Date()
            }
          });
          await transaction.pricingProject.create({
            data: {
              estimateNumber: "EST-888888888",
              companyId,
              clientId,
              ownerId,
              pricingConfigurationVersionId: version.id,
              projectName: "Invalid Cross-Company Configuration",
              status: "DRAFT",
              currency: "USD"
            }
          });
        })
      ).rejects.toThrow();
    } finally {
      await prisma.serviceCatalogItem.delete({ where: { id: otherService.id } });
      await prisma.client.delete({ where: { id: otherClient.id } });
      await prisma.applicationUser.delete({ where: { id: otherOwner.id } });
      await prisma.user.delete({ where: { id: otherAuthUser.id } });
      await prisma.company.delete({ where: { id: otherCompany.id } });
    }
  });

  it("keeps configuration versions immutable and historical Projects on their original version", async () => {
    const project = await prisma.pricingProject.findFirstOrThrow({
      where: { companyId, ownerId }
    });
    const originalVersionId = project.pricingConfigurationVersionId;
    await expect(
      prisma.pricingProject.update({
        where: { id: project.id },
        data: { estimateNumber: "EST-999999" }
      })
    ).rejects.toThrow(/immutable/i);
    await expect(
      prisma.pricingConfigurationVersion.update({
        where: { id: configurationVersionId },
        data: { engineVersion: "changed-engine" }
      })
    ).rejects.toThrow(/immutable/i);
    await expect(
      prisma.pricingConfigurationVersion.delete({
        where: { id: configurationVersionId }
      })
    ).rejects.toThrow(/cannot be deleted/i);
    expect(
      (
        await prisma.pricingProject.findUniqueOrThrow({
          where: { id: project.id }
        })
      ).pricingConfigurationVersionId
    ).toBe(originalVersionId);
  });

  it("enforces migration-level project, quantity, factor, and active-configuration constraints", async () => {
    const { createPrismaPricingProjectRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const repository = createPrismaPricingProjectRepository(prisma);

    await expect(repository.createPricingProject(companyId, draft("   "))).rejects.toThrow();
    await expect(
      repository.createPricingProject(companyId, draft("Zero Quantity", "0.00"))
    ).rejects.toThrow();
    await expect(
      repository.createPricingProject(companyId, {
        ...draft("Duplicate Factor"),
        complexitySelections: [
          ...draft("unused").complexitySelections,
          {
            factorCode: "business-size",
            optionCode: "business-size-6-15",
            sortOrder: 7
          }
        ]
      })
    ).rejects.toThrow();

    const activeVersion = await prisma.pricingConfigurationVersion.findUniqueOrThrow({
      where: { id: configurationVersionId }
    });
    await expect(
      prisma.pricingConfigurationVersion.create({
        data: {
          pricingConfigurationId: activeVersion.pricingConfigurationId,
          companyId,
          version: 2,
          status: "ACTIVE",
          schemaVersion: 1,
          engineVersion: "constraint-test",
          currency: "USD",
          configuration: {},
          effectiveFrom: new Date()
        }
      })
    ).rejects.toThrow();
  });

  it("exposes only company-scoped active catalog and configuration records", async () => {
    const { createPrismaPricingConfigurationRepository, createPrismaServiceCatalogRepository } =
      await import("@/infrastructure/database/pricing-repository");
    const catalog = createPrismaServiceCatalogRepository(prisma);
    const configurations = createPrismaPricingConfigurationRepository(prisma);

    expect(await catalog.listActiveServiceCatalogItems(companyId)).toHaveLength(29);
    expect(await catalog.listActiveServiceCatalogItems("another-company")).toEqual([]);
    expect((await configurations.findActivePricingConfiguration(companyId))?.version).toBe(2);
    expect(await configurations.findActivePricingConfiguration("another-company")).toBeNull();
  });
});
