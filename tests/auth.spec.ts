import { expect, test } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  DEFAULT_SIGN_UP_PASSWORD,
} from "./constants";
import { signUpAndConfirmUser } from "./auth-helpers";
const signUpPassword =
  process.env.E2E_SIGN_UP_PASSWORD ?? DEFAULT_SIGN_UP_PASSWORD;
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

test("signs up a user and confirms email from Inbucket", async ({ page }) => {
  const email = `signup-${Date.now()}@${mailboxDomain}`;

  await signUpAndConfirmUser(page, email, signUpPassword);
  await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
});

test("logs in, persists session, and logs out", async ({ page }) => {
  const email = `login-${Date.now()}@${mailboxDomain}`;

  await signUpAndConfirmUser(page, email, signUpPassword);

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: /^logout$/i }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(signUpPassword);
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("redirects unauthenticated users from /dashboard to /auth/login", async ({
  browser,
}) => {
  const isolatedContext = await browser.newContext();
  const isolatedPage = await isolatedContext.newPage();

  await isolatedPage.goto("/dashboard");
  await expect(isolatedPage).toHaveURL(/\/auth\/login/);

  await isolatedContext.close();
});
