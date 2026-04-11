import { expect, test } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  DEFAULT_SEEDED_SESSION_USER_EMAIL,
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
const seededSessionUserEmail =
  process.env.E2E_SEEDED_SESSION_USER_EMAIL ?? DEFAULT_SEEDED_SESSION_USER_EMAIL;

// ---------------------------------------------------------------------------
// Happy-path flows
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sign-up edge cases
// ---------------------------------------------------------------------------

test("shows error when signing up with an already-registered email", async ({
  page,
}) => {
  // Use the seeded complete user — guaranteed to exist after every db reset.
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(seededSessionUserEmail);
  await page.getByLabel("Password", { exact: true }).fill(signUpPassword);
  await page.getByLabel("Repeat Password").fill(signUpPassword);
  await page.getByRole("button", { name: /^sign up$/i }).click();

  // Supabase returns "User already registered" for a confirmed duplicate;
  // for an unconfirmed duplicate it returns no error but empty identities —
  // the form catches that separately and shows its own message.
  await expect(page.getByText(/user already registered|an account with this email already exists/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-up/);
});

test("shows error when passwords do not match on sign-up", async ({ page }) => {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(`mismatch-${Date.now()}@${mailboxDomain}`);
  await page.getByLabel("Password", { exact: true }).fill(signUpPassword);
  await page.getByLabel("Repeat Password").fill("different-password");
  await page.getByRole("button", { name: /^sign up$/i }).click();

  await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-up/);
});

// ---------------------------------------------------------------------------
// Login edge cases
// ---------------------------------------------------------------------------

test("shows error when logging in with the wrong password", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(seededSessionUserEmail);
  await page.getByLabel("Password", { exact: true }).fill("Wrong-password-99!");
  await page.getByRole("button", { name: /^login$/i }).click();

  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("shows error when logging in with an unknown email", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(`nobody-${Date.now()}@${mailboxDomain}`);
  await page.getByLabel("Password", { exact: true }).fill(signUpPassword);
  await page.getByRole("button", { name: /^login$/i }).click();

  await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login/);
});

// ---------------------------------------------------------------------------
// Authenticated-user redirects — auth pages must bounce logged-in users
// ---------------------------------------------------------------------------

test("redirects authenticated user away from /auth/login to /dashboard", async ({
  page,
}) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/auth/login");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("redirects authenticated user away from /auth/sign-up to /dashboard", async ({
  page,
}) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/auth/sign-up");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("redirects authenticated user away from /auth/forgot-password to /dashboard", async ({
  page,
}) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/auth/forgot-password");
  await expect(page).toHaveURL(/\/dashboard/);
});
