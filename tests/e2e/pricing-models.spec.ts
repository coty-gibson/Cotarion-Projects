import { expect, test } from "@playwright/test";

test("creates and reopens every Version 1 pricing model", async ({ page }) => {
  test.setTimeout(300_000);
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for pricing e2e.");
  const suffix = Date.now();
  const clientName = `Pricing Models E2E Client ${suffix}`;
  const projectNames = [
    `Fixed Retainer E2E ${suffix}`,
    `Profit Share E2E ${suffix}`,
    `Hybrid Retainer E2E ${suffix}`,
    `Advisory E2E ${suffix}`
  ];

  async function openNewProject() {
    await page.goto("/pricing-projects/new");
    await expect(page.getByTestId("pricing-workspace-ready")).toBeAttached();
    const clientId = await page
      .getByLabel("Client *")
      .locator("option")
      .filter({ hasText: clientName })
      .getAttribute("value");
    await page.getByLabel("Client *").selectOption(clientId!);
  }

  async function saveAndReopen(projectName: string, expectedAmount: string) {
    await expect(page.getByText(expectedAmount, { exact: true }).last()).toBeVisible();
    await page.getByRole("button", { name: "Save Draft" }).last().click();
    await expect(page.getByText("Pricing Project created and saved as Draft.")).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByText(expectedAmount, { exact: true }).last()).toBeVisible();
    await page.getByRole("link", { name: "Reopen Draft" }).click();
    await expect(page.getByTestId("pricing-workspace-ready")).toBeAttached();
  }

  try {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Development sign-in" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.goto("/clients/new");
    await page.getByLabel("Client name *").fill(clientName);
    await page.getByRole("button", { name: "Create client" }).click();

    await openNewProject();
    await page.getByLabel("Pricing model *").selectOption("FIXED_RETAINER");
    await page.getByLabel("Project name *").fill(projectNames[0]);
    await page.getByLabel("Term *").selectOption("6-month");
    await page.locator('select[name="discountId"]').selectOption("nonprofit");
    await expect(page.locator('select[name="discountId"]')).toHaveValue("nonprofit");
    await saveAndReopen(projectNames[0], "$850.00");

    await openNewProject();
    await page.getByLabel("Pricing model *").selectOption("PROFIT_SHARE_RETAINER");
    await page.getByLabel("Project name *").fill(projectNames[1]);
    for (const amount of await page.getByLabel("Adjusted Operating Profit *").all()) {
      await amount.fill("10000.00");
    }
    await saveAndReopen(projectNames[1], "$1,250.00");

    await openNewProject();
    await page.getByLabel("Pricing model *").selectOption("HYBRID_RETAINER");
    await page.getByLabel("Project name *").fill(projectNames[2]);
    await page.getByLabel("Fixed monthly payment *").fill("500.00");
    for (const amount of await page.getByLabel("Adjusted Operating Profit *").all()) {
      await amount.fill("10000.00");
    }
    await saveAndReopen(projectNames[2], "$1,150.00");

    await openNewProject();
    await page.getByLabel("Pricing model *").selectOption("FIXED_RETAINER");
    await page.getByLabel("Pricing model *").selectOption("ADVISORY_HOURLY");
    await page.getByLabel("Project name *").fill(projectNames[3]);
    await page.getByLabel("Duration *").selectOption("90");
    await saveAndReopen(projectNames[3], "$375.00");

    await page.goto("/pricing-projects");
    for (const projectName of projectNames) {
      await expect(page.getByRole("link", { name: projectName })).toBeVisible();
    }

    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("@prisma/client");
    const verificationClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    });
    const persisted = await verificationClient.pricingProject.findMany({
      where: { projectName: { in: projectNames } },
      orderBy: { projectName: "asc" }
    });
    expect(persisted).toHaveLength(4);
    expect(
      new Set(persisted.map(({ pricingConfigurationVersionId }) => pricingConfigurationVersionId))
        .size
    ).toBe(1);
    expect(persisted.map(({ pricingModel }) => pricingModel).sort()).toEqual(
      ["ADVISORY_HOURLY", "FIXED_RETAINER", "HYBRID_RETAINER", "PROFIT_SHARE_RETAINER"].sort()
    );
    for (const project of persisted) {
      expect(project.methodologyVersion).toMatch(/^(advisory-hourly|retainer-pricing)\/1\.0\.0$/);
      expect(project.pricingInputSnapshot).toEqual(
        expect.objectContaining({ pricingModel: project.pricingModel })
      );
      expect(project.pricingOutputSnapshot).toEqual(
        expect.objectContaining({
          pricingModel: project.pricingModel,
          methodologyVersion: project.methodologyVersion,
          currency: "USD"
        })
      );
    }
    await verificationClient.$disconnect();
  } finally {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("@prisma/client");
    const cleanupClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    });
    await cleanupClient.pricingProject.deleteMany({
      where: { projectName: { in: projectNames } }
    });
    await cleanupClient.client.deleteMany({ where: { name: clientName } });
    await cleanupClient.$disconnect();
  }
});
