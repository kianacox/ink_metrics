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
}

const SUCCESS_TOAST_TEXT = "Session saved successfully.";

function getSessionDialog(page: Page) {
  return page.getByRole("dialog", { name: /log a session/i });
}

export async function openAddSessionModal(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^add session$/i }).click();
  await expect(getSessionDialog(page)).toBeVisible();
}

export async function fillSessionFields(
  page: Page,
  { clientName, hours, minutes, price, sessionDateTime }: SessionInput,
): Promise<void> {
  await page.getByLabel("Client (type to search existing or create new)").fill(clientName);
  await page.getByLabel("Hours").fill(hours);
  await page.getByLabel("Minutes").fill(minutes);
  if (sessionDateTime) {
    await page.getByLabel("Session date and time").fill(sessionDateTime);
  }
  await page.getByLabel("Price").fill(price);
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
