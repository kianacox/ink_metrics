import { expect, test, type Page } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  getSignUpPassword,
} from "./constants";
import {
  clearMailbox,
  completeProfileSetupMinimal,
  fetchConfirmationLink,
  loginAsUser,
  signUpAndConfirmUserOnly,
} from "./auth-helpers";

const signUpPassword = getSignUpPassword();
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
  // -------------------------------------------------------------------------
  // Email display
  // -------------------------------------------------------------------------

  test("displays the user's current email address", async ({ page }) => {
    const email = await createProfileCompleteUser(page, "settings-display");
    await openSettingsTab(page);

    const settingsPanel = page.locator("#tabpanel-settings");
    await expect(settingsPanel.locator("#settings-current-email")).toContainText(email);
  });

  // -------------------------------------------------------------------------
  // Email update — happy path
  // -------------------------------------------------------------------------

  test("submits update email request and shows success feedback", async ({
    page,
  }) => {
    await createProfileCompleteUser(page, "settings-email");
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

  test("email address is not updated until the confirmation link is clicked", async ({
    page,
  }) => {
    const currentEmail = await createProfileCompleteUser(page, "settings-pending");
    const nextEmail = makeDisposableEmail("settings-pending-new");
    await openSettingsTab(page);

    const settingsPanel = page.locator("#tabpanel-settings");

    // Request the email change
    await settingsPanel.locator("#settings-new-email").fill(nextEmail);
    await settingsPanel.getByRole("button", { name: /^send confirmation$/i }).click();
    await expect(settingsPanel.getByRole("status")).toContainText(
      /check your inbox/i,
    );

    // Reload and revisit settings — the displayed email must still be the original
    await openSettingsTab(page);
    await expect(settingsPanel.locator("#settings-current-email")).toContainText(currentEmail);
    await expect(settingsPanel.locator("#settings-current-email")).not.toContainText(nextEmail);
  });

  test("updates email after confirming both change links", async ({ page }) => {
    const currentEmail = await createProfileCompleteUser(page, "email-confirm");
    const nextEmail = makeDisposableEmail("email-confirm-new");

    // Clear inboxes so we only find the change-confirmation emails
    await clearMailbox(currentEmail);
    await clearMailbox(nextEmail);

    await openSettingsTab(page);
    const settingsPanel = page.locator("#tabpanel-settings");

    // Request email change
    await settingsPanel.locator("#settings-new-email").fill(nextEmail);
    await settingsPanel.getByRole("button", { name: /^send confirmation$/i }).click();
    await expect(settingsPanel.getByRole("status")).toContainText(
      /check your inbox/i,
    );

    // Click the link in the new email's inbox first
    const newEmailLink = await fetchConfirmationLink(nextEmail);
    await page.goto(newEmailLink);

    // Click the link in the old email's inbox (required by double_confirm_changes)
    const oldEmailLink = await fetchConfirmationLink(currentEmail);
    await page.goto(oldEmailLink);

    // Email should now be updated
    await openSettingsTab(page);
    await expect(settingsPanel.locator("#settings-current-email")).toContainText(nextEmail);
  });

  // -------------------------------------------------------------------------
  // Email update — validation edge cases
  // -------------------------------------------------------------------------

  test("shows error when submitting the current email address", async ({
    page,
  }) => {
    const currentEmail = await createProfileCompleteUser(page, "settings-same");
    await openSettingsTab(page);

    const settingsPanel = page.locator("#tabpanel-settings");
    await settingsPanel.locator("#settings-new-email").fill(currentEmail);
    await settingsPanel.getByRole("button", { name: /^send confirmation$/i }).click();

    await expect(settingsPanel.getByRole("status")).toContainText(
      /this is already your current email address/i,
    );
  });

  test("shows error when submitting the current email address with different casing", async ({
    page,
  }) => {
    const currentEmail = await createProfileCompleteUser(page, "settings-case");
    await openSettingsTab(page);

    const settingsPanel = page.locator("#tabpanel-settings");
    await settingsPanel.locator("#settings-new-email").fill(currentEmail.toUpperCase());
    await settingsPanel.getByRole("button", { name: /^send confirmation$/i }).click();

    await expect(settingsPanel.getByRole("status")).toContainText(
      /this is already your current email address/i,
    );
  });

  // -------------------------------------------------------------------------
  // Account deletion
  // -------------------------------------------------------------------------

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
