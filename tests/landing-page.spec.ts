import { test, expect } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero headline", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Know your numbers/i }),
    ).toBeVisible();
  });

  test("hero primary CTA links to sign-up", async ({ page }) => {
    const link = page
      .getByRole("link", { name: "Start free for 60 days" })
      .first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/auth/sign-up");
  });

  test("nav Pricing link navigates to pricing page", async ({ page }) => {
    await page.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL("/pricing");
    await expect(
      page.getByRole("heading", { name: /Simple pricing/i }),
    ).toBeVisible();
  });

  test("footer Privacy Policy link present", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toBeVisible();
  });

  test("footer Terms and Conditions link present", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Terms and Conditions" }),
    ).toBeVisible();
  });
});

test.describe("Landing page — authenticated redirect", () => {
  test("authenticated user on / redirects to /dashboard", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("Pricing page", () => {
  test("shows plan price and CTA", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("£9.99")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start free for 60 days" }),
    ).toBeVisible();
  });

  test("pricing CTA links to sign-up", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("link", { name: "Start free for 60 days" }),
    ).toHaveAttribute("href", "/auth/sign-up");
  });

  test("authenticated user on /pricing redirects to /dashboard", async ({
    page,
  }) => {
    await loginAsSeededUser(page, "sessionComplete");
    await page.goto("/pricing");
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("Sign-up page — trial messaging", () => {
  test("shows 60 days free messaging", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByText(/60 days free/i)).toBeVisible();
  });
});
