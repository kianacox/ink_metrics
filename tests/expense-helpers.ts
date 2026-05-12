import { expect, type Locator, type Page } from "@playwright/test";

const CREATED_TOAST_TEXT = "Expense logged successfully.";
const UPDATED_TOAST_TEXT = "Expense updated successfully.";
const DELETED_TOAST_TEXT = "Expense deleted successfully.";

const MAX_CALENDAR_NAV_STEPS = 240; // 20 years either side, plenty for any test

/**
 * Pick a date on the shared calendar+popover DatePicker.
 *
 * @param page         The Playwright page.
 * @param dialog       Container the picker lives in (so we can scope the trigger).
 * @param testId       data-testid of the trigger button.
 * @param dateStr      Target date as YYYY-MM-DD.
 */
export async function pickDateOnDatePicker(
  page: Page,
  dialog: Locator,
  testId: string,
  dateStr: string,
): Promise<void> {
  const [targetYear, targetMonth, targetDay] = dateStr.split("-").map(Number);

  await dialog.getByTestId(testId).click();

  // Calendar renders in a Radix portal outside the dialog.
  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible({ timeout: 5000 });

  for (let i = 0; i < MAX_CALENDAR_NAV_STEPS; i++) {
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

  await calendar
    .locator("button[data-day]:not([disabled])")
    .filter({ hasText: new RegExp(`^${targetDay}$`) })
    .first()
    .click();
}

export interface ExpenseInput {
  item: string;
  category?: string;
  amount?: string;
  datePurchased?: string;
}

export async function goToExpensesPage(page: Page): Promise<void> {
  await page.goto("/dashboard/expenses");
  await expect(page).toHaveURL(/\/dashboard\/expenses/);
  await expect(page.getByRole("heading", { name: /^expenses$/i })).toBeVisible();
}

export async function openCreateExpenseModal(page: Page): Promise<void> {
  await page.getByTestId("create-expense-fab").click();
  await expect(page.getByRole("dialog", { name: /log an expense/i })).toBeVisible();
}

export async function createExpense(page: Page, input: ExpenseInput): Promise<void> {
  await openCreateExpenseModal(page);
  const dialog = page.getByRole("dialog", { name: /log an expense/i });

  await dialog.getByLabel("Item name").fill(input.item);

  if (input.category) {
    await dialog.getByLabel("Category").selectOption({ label: input.category });
  }

  if (input.amount) {
    await dialog.getByLabel(/amount/i).fill(input.amount);
  } else {
    await dialog.getByLabel(/amount/i).fill("10.00");
  }

  if (input.datePurchased) {
    await pickDateOnDatePicker(page, dialog, "expense-date-picker", input.datePurchased);
  }

  await dialog.getByRole("button", { name: /log expense/i }).click();
  await expect(page.getByRole("status")).toContainText(CREATED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function editExpenseFromExpensesPage(
  page: Page,
  itemName: string,
  updates: { item?: string; amount?: string },
): Promise<void> {
  await page.getByRole("button", { name: `Edit expense: ${itemName}` }).first().click();
  const dialog = page.getByRole("dialog", { name: /edit expense/i });
  await expect(dialog).toBeVisible();

  if (updates.item) {
    await dialog.getByLabel("Item name").fill(updates.item);
  }
  if (updates.amount) {
    await dialog.getByLabel(/amount/i).fill(updates.amount);
  }

  await dialog.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status")).toContainText(UPDATED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function deleteExpenseFromExpensesPage(
  page: Page,
  itemName: string,
): Promise<void> {
  await page.getByRole("button", { name: `Delete expense: ${itemName}` }).first().click();
  const dialog = page.getByRole("dialog", { name: /delete expense/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /delete permanently/i }).click();
  await expect(page.getByRole("status")).toContainText(DELETED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function expectExpenseVisibleInTable(page: Page, itemName: string): Promise<void> {
  const row = page.locator("tbody tr", { hasText: itemName }).first();
  await expect(row).toBeVisible();
}

export async function expectExpenseNotVisibleInTable(
  page: Page,
  itemName: string,
): Promise<void> {
  const row = page.locator("tbody tr", { hasText: itemName });
  await expect(row).toHaveCount(0);
}

export async function selectCategoryFilter(page: Page, categoryLabel: string): Promise<void> {
  await page.getByRole("button", { name: categoryLabel, exact: true }).click();
}

export async function clearCategoryFilters(page: Page): Promise<void> {
  await page.getByRole("button", { name: /clear all/i }).click();
}

export async function selectDateRangeFilter(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${label}$`, "i") }).click();
}
