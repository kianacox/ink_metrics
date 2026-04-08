import { expect, test } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  DEFAULT_SIGN_UP_PASSWORD,
} from "./constants";
import {
  completeProfileSetupMinimal,
  loginAsSeededUser,
  signUpAndConfirmUser,
  signUpAndConfirmUserOnly,
} from "./auth-helpers";
const signUpPassword =
  process.env.E2E_SIGN_UP_PASSWORD ?? DEFAULT_SIGN_UP_PASSWORD;
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

test("new user is sent to profile setup and can finish onboarding", async ({
  page,
}) => {
  const email = `signup-${Date.now()}@${mailboxDomain}`;

  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);

  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
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

test("redirects incomplete users to profile setup for protected dashboard routes", async ({
  page,
}) => {
  await loginAsSeededUser(page, "incomplete");
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);

  await page.goto("/dashboard/sessions");
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
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
