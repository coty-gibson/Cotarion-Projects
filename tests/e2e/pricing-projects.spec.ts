import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("creates, prices, saves, reopens, and updates a Pricing Project", async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for pricing e2e.");
  const suffix = Date.now();
  const clientName = `Pricing E2E Client ${suffix}`;
  const projectName = `Pricing E2E Project ${suffix}`;
  const updatedProjectName = `${projectName} Updated`;

  try {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Development sign-in" }).click();
    await page.getByRole("link", { name: "Clients", exact: true }).first().click();
    await page
      .getByRole("link", { name: /Create client/i })
      .first()
      .click();
    await page.getByLabel("Client name *").fill(clientName);
    await page.getByRole("button", { name: "Create client" }).click();

    await page.getByRole("link", { name: "New Pricing Project" }).click();
    await expect(page.getByTestId("pricing-workspace-ready")).toBeAttached();
    await page.getByLabel("Project name *").fill(projectName);
    await page
      .locator('select[name="lineServiceId"]')
      .first()
      .selectOption({ label: "Business Strategy Session · $250.00" });
    await page.getByLabel("Quantity").fill("2");
    await page.getByLabel("Business Size").selectOption("business-size-6-15");
    await page.getByLabel("Discount").selectOption("nonprofit");

    await expect(page.getByText("$495.00", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add service" }).click();
    await page
      .locator('select[name="lineServiceId"]')
      .nth(1)
      .selectOption({ label: "Simple SOP · $75.00" });
    await page.getByLabel("Quantity").nth(1).fill("2");
    await expect(page.getByText("$643.50", { exact: true })).toBeVisible();

    await mkdir("docs/screenshots", { recursive: true });
    await page.screenshot({
      path: "docs/screenshots/phase-4-pricing-workspace.png",
      fullPage: true
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(
      page.getByRole("link", { name: "Pricing Projects", exact: true }).last()
    ).toBeVisible();
    await expect(page.getByText("$643.50", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/phase-4-pricing-workspace-tablet.png",
      fullPage: true
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("link", { name: "Pricing Projects", exact: true }).last()
    ).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/phase-4-pricing-workspace-mobile.png",
      fullPage: true
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: "Save Draft" }).last().click();

    await expect(page.getByText("Pricing Project created and saved as Draft.")).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByText(/^EST-\d{6,}$/)).toBeVisible();
    await expect(page.getByText("$643.50", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Reopen Draft" }).click();
    await expect(page.getByTestId("pricing-workspace-ready")).toBeAttached();
    await page.getByLabel("Project name *").fill(updatedProjectName);
    await page.getByLabel("Quantity").first().fill("1");
    await expect(page.getByText("$396.00", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save Draft" }).last().click();

    await expect(page.getByText("Draft saved successfully.")).toBeVisible();
    await expect(page.getByText(updatedProjectName)).toBeVisible();
    await expect(page.getByText("$396.00", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "docs/screenshots/phase-4-pricing-project-detail.png",
      fullPage: true
    });

    await page.getByRole("link", { name: "All Pricing Projects" }).click();
    await expect(page.getByRole("link", { name: updatedProjectName })).toBeVisible();
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: updatedProjectName })
        .getByRole("link", { name: "Reopen Draft" })
    ).toBeVisible();
  } finally {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("@prisma/client");
    const cleanupClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    });
    await cleanupClient.pricingProject.deleteMany({
      where: { projectName: { in: [projectName, updatedProjectName] } }
    });
    await cleanupClient.client.deleteMany({ where: { name: clientName } });
    await cleanupClient.$disconnect();
  }
});
