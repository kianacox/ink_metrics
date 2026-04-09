import { expect, test } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  DEFAULT_SIGN_UP_PASSWORD,
} from "./constants";
import { signUpAndConfirmUserOnly } from "./auth-helpers";

const signUpPassword =
  process.env.E2E_SIGN_UP_PASSWORD ?? DEFAULT_SIGN_UP_PASSWORD;
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

test("mobile profile setup keeps a stable step count and finishes successfully", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `profile-mobile-${Date.now()}@${mailboxDomain}`;

  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);

  await expect(page.getByText(/step 1 of 4/i)).toBeVisible();
  await page.locator("#profile-name:visible").fill("Mobile Setup User");
  await expect(page.locator("#reporting-timezone:visible")).not.toHaveValue("");
  await page.getByRole("button", { name: /^next$/i }).click();

  await expect(page.getByText(/step 2 of 4/i)).toBeVisible();
  await page.getByRole("button", { name: /^no$/i }).click();
  await page.getByRole("button", { name: /^next$/i }).click();

  await expect(page.getByText(/step 3 of 4/i)).toBeVisible();
  await expect(
    page.getByText(/you selected no chair rent\. continue to confirm your setup\./i),
  ).toBeVisible();
  await page.getByRole("button", { name: /^next$/i }).click();

  await expect(page.getByText(/step 4 of 4/i)).toBeVisible();
  await page.getByRole("button", { name: /^finish setup$/i }).click();

  await expect(
    page.getByText(/you.re all setup! welcome to inkmetrics\./i),
  ).toBeVisible();
  const continueButton = page.getByRole("button", { name: /continue to dashboard/i });
  await continueButton.click();

  await expect(page).toHaveURL(/\/dashboard/);
});

test("profile setup blocks partial submission", async ({ page }) => {
  const email = `profile-partial-${Date.now()}@${mailboxDomain}`;

  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);

  await page.locator("#profile-name:visible").fill("Partial User");
  await page.getByRole("button", { name: /^finish setup$/i }).first().click();

  await expect(page.getByRole("status")).toContainText(/chair rent selection is required\./i);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
});
