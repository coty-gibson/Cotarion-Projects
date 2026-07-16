import { expect, test } from "@playwright/test";

test("redirects unauthenticated users to sign in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
});

test("development sign-in reaches the protected shell", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database-backed auth e2e.");

  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Development sign-in" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Pricing & Proposals" })).toBeVisible();
  await expect(page.getByText("Sprint 1 establishes the project foundation")).toBeVisible();
  await expect(page.getByText("Services & Pricing")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
