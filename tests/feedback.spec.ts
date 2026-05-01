import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";

test.describe("Feedback page", () => {
  test("logged-out visitor is redirected to /auth/login", async ({
    browser,
  }) => {
    const isolatedContext = await browser.newContext();
    const isolatedPage = await isolatedContext.newPage();

    await isolatedPage.goto("/feedback");
    await expect(isolatedPage).toHaveURL(/\/auth\/login/);

    await isolatedContext.close();
  });

  test("signed-in user can submit feedback and see confirmation", async ({
    page,
  }) => {
    await loginAsSeededUser(page, "sessionComplete");

    await page.goto("/feedback");
    await expect(
      page.getByRole("heading", { name: /Share feedback/i }),
    ).toBeVisible();

    await page.getByLabel("Category").selectOption("General feedback");
    await page
      .getByLabel("Message")
      .fill("Loving the app — keep up the great work!");
    await page.getByRole("button", { name: /Send feedback/i }).click();

    await expect(
      page.getByRole("heading", {
        name: /Thanks — we've got your feedback/i,
      }),
    ).toBeVisible();
  });
});
