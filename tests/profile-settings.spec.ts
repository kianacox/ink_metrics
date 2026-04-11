import { expect, test, type Page } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  DEFAULT_SIGN_UP_PASSWORD,
} from "./constants";
import {
  completeProfileSetupMinimal,
  loginAsUser,
  signUpAndConfirmUserOnly,
} from "./auth-helpers";

const signUpPassword =
  process.env.E2E_SIGN_UP_PASSWORD ?? DEFAULT_SIGN_UP_PASSWORD;
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

function makeDisposableEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}@${mailboxDomain}`;
}

async function openSettingsTab(page: Page): Promise<void> {
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/dashboard\/profile/);
  await page.getByRole("tab", { name: /^settings$/i }).click();
  await expect(
    page.getByRole("tab", { name: /^settings$/i }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tabpanel-settings")).toBeVisible();
}

async function createProfileCompleteUser(
  page: Page,
  emailPrefix: string,
): Promise<string> {
  const email = makeDisposableEmail(emailPrefix);
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await completeProfileSetupMinimal(page, email);
  return email;
}

test.describe("profile settings", () => {
  test("submits update email request and shows success feedback", async ({
    page,
  }) => {
    const currentEmail = await createProfileCompleteUser(page, "settings-email");
    const nextEmail = makeDisposableEmail("settings-email-new");
    await openSettingsTab(page);

    const settingsPanel = page.locator("#tabpanel-settings");
    const newEmailField = settingsPanel.locator("#settings-new-email");
    const submitButton = settingsPanel.getByRole("button", {
      name: /^send confirmation$/i,
    });

    await newEmailField.fill(nextEmail);
    await submitButton.click();

    await expect(settingsPanel.getByRole("status")).toContainText(
      /check your inbox.*confirmation link has been sent/i,
    );
    await expect(newEmailField).toHaveValue("");
  });

  test("deletes account, signs out, and blocks future access", async ({
    page,
  }) => {
    const email = await createProfileCompleteUser(page, "settings-delete");
    await openSettingsTab(page);

    const settingsPanel = page.locator("#tabpanel-settings");
    await settingsPanel.getByRole("button", { name: /^delete account$/i }).click();

    const deleteDialog = page.getByRole("dialog", { name: /^delete account$/i });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: /^confirm$/i }).click();

    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto("/dashboard/profile");
    await expect(page).toHaveURL(/\/auth\/login/);

    await loginAsUser(page, email, signUpPassword);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
