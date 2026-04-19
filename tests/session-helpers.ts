import { expect, type Page } from "@playwright/test";
import {
  formatSessionDuration,
  formatSessionProfit,
} from "@/components/dashboard/sessions/utils/session-formatting";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface SessionInput {
  clientName: string;
  hours: string;
  minutes: string;
  price: string;
  sessionDateTime?: string;
  inProgress?: boolean;
}

const SUCCESS_TOAST_TEXT = "Session saved successfully.";
const UPDATED_TOAST_TEXT = "Session updated successfully.";
const DELETED_TOAST_TEXT = "Session deleted successfully.";

function getSessionDialog(page: Page) {
  return page.getByRole("dialog", { name: /log a session/i });
}

export async function openAddSessionModal(page: Page): Promise<void> {
  // networkidle ensures React has hydrated and event handlers are attached.
  await page.waitForLoadState("networkidle");
  const btn = page.getByRole("button", { name: /^add session$/i });
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
  await expect(getSessionDialog(page)).toBeVisible({ timeout: 20000 });
}

export async function fillSessionFields(
  page: Page,
  { clientName, hours, minutes, price, sessionDateTime, inProgress }: SessionInput,
): Promise<void> {
  await page.getByLabel("Client (type to search existing or create new)").fill(clientName);
  await page.getByLabel("Hours").fill(hours);
  await page.getByLabel("Minutes").fill(minutes);
  if (sessionDateTime) {
    await page.getByLabel("Session date and time").fill(sessionDateTime);
  }
  await page.getByLabel("Price").fill(price);
  if (inProgress !== undefined) {
    const checkbox = page.getByLabel("Follow-up session needed");
    const isChecked = await checkbox.isChecked();
    if (inProgress !== isChecked) {
      await checkbox.click();
    }
  }
}

export async function selectCreateNewClientOption(
  page: Page,
  clientName: string,
): Promise<void> {
  const createButton = page.getByRole("button", {
    name: `Create new client: ${clientName}`,
  });
  await expect(createButton).toBeVisible();
  await createButton.click();
}

export async function selectExistingClientOption(
  page: Page,
  clientName: string,
): Promise<void> {
  const useExistingButton = page.getByRole("button", {
    name: `Use existing: ${clientName}`,
  });
  await expect(useExistingButton).toBeVisible();
  await useExistingButton.click();
}

export async function saveSessionAndExpectSuccess(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^save session$/i }).click();
  await expect(page.getByRole("status")).toContainText(SUCCESS_TOAST_TEXT);
  await expect(getSessionDialog(page)).not.toBeVisible();
}

export async function createSessionWithNewClient(
  page: Page,
  input: SessionInput,
): Promise<void> {
  await openAddSessionModal(page);
  await fillSessionFields(page, input);
  await selectCreateNewClientOption(page, input.clientName);
  await saveSessionAndExpectSuccess(page);
}

export async function createSessionWithExistingClient(
  page: Page,
  input: SessionInput,
): Promise<void> {
  await openAddSessionModal(page);
  await fillSessionFields(page, input);
  await selectExistingClientOption(page, input.clientName);
  await saveSessionAndExpectSuccess(page);
}

export async function goToSessionsPage(page: Page): Promise<void> {
  await page.goto("/dashboard/sessions");
  await expect(page).toHaveURL(/\/dashboard\/sessions/);
  await expect(page.getByRole("heading", { name: /^sessions$/i })).toBeVisible();
}

export async function expectSessionVisible(
  page: Page,
  session: { clientName: string; durationMinutes: number; priceMinor: number },
): Promise<void> {
  const durationText = formatSessionDuration(session.durationMinutes);
  const profitText = formatSessionProfit(session.priceMinor, DEFAULT_CURRENCY);
  const sessionRow = page.locator("tbody tr", { hasText: session.clientName }).first();

  await expect(sessionRow).toBeVisible();
  await expect(sessionRow).toContainText(session.clientName);
  await expect(sessionRow).toContainText(durationText);
  await expect(sessionRow).toContainText(profitText);
}

export async function expectSessionNotVisible(
  page: Page,
  session: { clientName: string },
): Promise<void> {
  const sessionRow = page.locator("tbody tr", { hasText: session.clientName }).first();
  await expect(sessionRow).toHaveCount(0);
}

export async function editSessionFromSessionsPage(
  page: Page,
  input: {
    clientName: string;
    hours: string;
    minutes: string;
    price: string;
    sessionDateTime: string;
  },
): Promise<void> {
  const row = page.locator("tbody tr", { hasText: input.clientName }).first();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: `Edit session for ${input.clientName}` }).click();

  const dialog = page.getByRole("dialog", { name: /edit session/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Client")).toBeDisabled();

  await dialog.getByLabel("Hours").fill(input.hours);
  await dialog.getByLabel("Minutes").fill(input.minutes);
  await dialog.getByLabel("Session date and time").fill(input.sessionDateTime);
  await dialog.getByLabel("Price").fill(input.price);
  await dialog.getByRole("button", { name: /^confirm$/i }).click();

  await expect(page.getByRole("status")).toContainText(UPDATED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function openDeleteSessionModalFromSessionsPage(
  page: Page,
  clientName: string,
): Promise<void> {
  const row = page.locator("tbody tr", { hasText: clientName }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: `Delete session for ${clientName}` }).click();
  await expect(page.getByRole("dialog", { name: /delete session/i })).toBeVisible();
}

export async function cancelDeleteSession(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /delete session/i });
  await dialog.getByRole("button", { name: /^cancel$/i }).click();
  await expect(dialog).not.toBeVisible();
}

export async function confirmDeleteSession(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /delete session/i });
  await dialog.getByRole("button", { name: /^confirm$/i }).click();
  await expect(page.getByRole("status")).toContainText(DELETED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}
