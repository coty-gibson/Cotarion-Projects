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

  await expect(page.getByRole("heading", { level: 2, name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clients", exact: true })).toBeVisible();
  await expect(page.getByText("Services & Pricing")).toBeVisible();
  await expect(page.getByText("Coming Soon").first()).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
