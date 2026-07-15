import { expect, test } from "@playwright/test";

test("renders the Sprint 1 shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Pricing & Proposals" })).toBeVisible();
  await expect(page.getByText("Sprint 1 establishes the project foundation")).toBeVisible();
  await expect(page.getByText("Services & Pricing")).toBeVisible();
});
