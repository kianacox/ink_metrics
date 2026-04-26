import { expect, type Locator, type Page } from "@playwright/test";
import { formatSessionProfit } from "@/components/dashboard/sessions/utils/session-formatting";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface SessionInput {
  clientName: string;
  price: string;
  sessionDate?: string; // "YYYY-MM-DD" — omit to keep auto-set today date
  inProgress?: boolean;
}

const SUCCESS_TOAST_TEXT = "Session saved successfully.";
const UPDATED_TOAST_TEXT = "Session updated successfully.";
const DELETED_TOAST_TEXT = "Session deleted successfully.";

function getSessionDialog(page: Page) {
  return page.getByRole("dialog", { name: /log a session/i });
}

export function dateStringDaysAgo(days: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60_000);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export async function pickSessionDate(
  page: Page,
  container: Locator,
  dateStr: string, // "YYYY-MM-DD"
): Promise<void> {
  const [targetYear, targetMonth, targetDay] = dateStr.split("-").map(Number);

  // Click the trigger button inside the "Session date" section
  const trigger = container
    .locator("div")
    .filter({ has: container.locator("label", { hasText: "Session date" }) })
    .locator('button[type="button"]')
    .first();
  await trigger.click();

  // Calendar renders in a Radix portal outside the dialog
  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible({ timeout: 5000 });

  // Navigate to the target month
  for (let i = 0; i < 18; i++) {
    const captionText = (await calendar.locator(".rdp-caption_label").textContent()) ?? "";
    const match = captionText.trim().match(/(\w+)\s+(\d{4})/);
    if (!match) break;
    const currentMonth = new Date(`${match[1]} 1, 2000`).getMonth() + 1;
    const currentYear = parseInt(match[2], 10);
    if (currentYear === targetYear && currentMonth === targetMonth) break;
    const isAfter =
      currentYear > targetYear || (currentYear === targetYear && currentMonth > targetMonth);
    await (isAfter
      ? calendar.locator(".rdp-button_previous")
      : calendar.locator(".rdp-button_next")
    ).click();
  }

  // Click the target day (first enabled button matching the day number)
  await calendar
    .locator("button[data-day]:not([disabled])")
    .filter({ hasText: new RegExp(`^${targetDay}$`) })
    .first()
    .click();
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
  { clientName, price, sessionDate, inProgress }: SessionInput,
): Promise<void> {
  const dialog = getSessionDialog(page);
  await dialog.getByLabel("Client (type to search existing or create new)").fill(clientName);
  if (sessionDate) {
    await pickSessionDate(page, dialog, sessionDate);
  }
  await dialog.getByPlaceholder("e.g. 12.50").fill(price);
  if (inProgress !== undefined) {
    const checkbox = dialog.getByLabel("Follow-up session needed");
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
  session: { clientName: string; priceMinor: number },
): Promise<void> {
  const profitText = formatSessionProfit(session.priceMinor, DEFAULT_CURRENCY);
  const sessionRow = page.locator("tbody tr", { hasText: session.clientName }).first();

  await expect(sessionRow).toBeVisible();
  await expect(sessionRow).toContainText(session.clientName);
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
    price: string;
    sessionDate?: string;
  },
): Promise<void> {
  const row = page.locator("tbody tr", { hasText: input.clientName }).first();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: `Edit session for ${input.clientName}` }).click();

  const dialog = page.getByRole("dialog", { name: /edit session/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Client")).toBeDisabled();

  if (input.sessionDate) {
    await pickSessionDate(page, dialog, input.sessionDate);
  }
  await dialog.getByPlaceholder("e.g. 12.50").fill(input.price);
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
