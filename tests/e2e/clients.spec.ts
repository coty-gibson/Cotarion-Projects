import { expect, test } from "@playwright/test";

test("creates, views, edits, and searches for a client", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database-backed client e2e.");
  const clientName = `E2E Client ${Date.now()}`;

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Development sign-in" }).click();
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByRole("link", { name: "Create client" }).click();

  await page.getByLabel("Client name *").fill(clientName);
  await page.getByLabel("Industry").selectOption("CONSULTING");
  await page.getByLabel("Website").fill("https://e2e-client.example");
  await page.getByLabel("Street").fill("100 Test Street");
  await page.getByLabel("City").fill("Chicago");
  await page.getByLabel("State", { exact: true }).fill("IL");
  await page.getByLabel("ZIP/Postal Code").fill("60601");
  await page.getByLabel("First name").fill("Taylor");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Email").fill("taylor@e2e-client.example");
  await page.getByLabel("Phone number").fill("+1 312 555 0110");
  await page.getByLabel("Relationship notes").fill("Initial relationship meeting completed.");
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(page.getByText("Client created successfully.")).toBeVisible();
  await expect(page.getByText(clientName)).toBeVisible();
  await expect(page.getByText(/^CLI-\d{6,}$/)).toBeVisible();
  await expect(page.getByText("Consulting", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Edit client" }).click();
  await page.getByLabel("Status *").selectOption("ACTIVE_CLIENT");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Client updated successfully.")).toBeVisible();
  await expect(page.getByText("Active Client")).toBeVisible();

  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByPlaceholder("Search name, website, contact, email, or phone").fill("555 0110");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("link", { name: clientName })).toBeVisible();

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const cleanupClient = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  });
  await cleanupClient.client.deleteMany({ where: { name: clientName } });
  await cleanupClient.$disconnect();
});
