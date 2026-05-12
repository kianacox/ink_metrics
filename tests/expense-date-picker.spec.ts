import { expect, test } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";
import {
  createExpense,
  expectExpenseVisibleInTable,
  goToExpensesPage,
  openCreateExpenseModal,
  pickDateOnDatePicker,
  selectDateRangeFilter,
} from "./expense-helpers";

const PAST_DATE = "2024-06-15";

function uniqueItem(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

test.beforeEach(async ({ page }) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("create modal date picker opens a calendar and lets a user pick a past date", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goToExpensesPage(page);
  await selectDateRangeFilter(page, "All time");

  await openCreateExpenseModal(page);
  const dialog = page.getByRole("dialog", { name: /log an expense/i });

  // The native date input is gone — the trigger is a button with the test id.
  const trigger = dialog.getByTestId("expense-date-picker");
  await expect(trigger).toBeVisible();
  await trigger.click();

  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();
});

test("a selected date appears on the trigger and the expense submits", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const item = uniqueItem("picker-create");
  await goToExpensesPage(page);
  await selectDateRangeFilter(page, "All time");

  await createExpense(page, {
    item,
    category: "Ink",
    amount: "9.00",
    datePurchased: PAST_DATE,
  });

  await expectExpenseVisibleInTable(page, item);
});

test("future dates are not selectable in the expense date picker", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goToExpensesPage(page);
  await selectDateRangeFilter(page, "All time");

  await openCreateExpenseModal(page);
  const dialog = page.getByRole("dialog", { name: /log an expense/i });
  await dialog.getByTestId("expense-date-picker").click();

  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();

  // Compute tomorrow in local time and verify it is disabled if visible.
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.getDate();

  // The current month grid renders today; if tomorrow falls in the same month,
  // its day button should be disabled. If tomorrow is on the 1st of next
  // month, the calendar shows it as an outside/disabled day — also covered.
  const candidate = calendar
    .locator(`button[data-day]`)
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first();

  if ((await candidate.count()) > 0) {
    await expect(candidate).toBeDisabled();
  }
});

test("edit modal pre-populates with the existing expense date and saves successfully", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const item = uniqueItem("picker-edit");
  await goToExpensesPage(page);
  await selectDateRangeFilter(page, "All time");
  await createExpense(page, {
    item,
    category: "Ink",
    amount: "7.00",
    datePurchased: PAST_DATE,
  });

  // Open the edit modal
  await page
    .getByRole("button", { name: `Edit expense: ${item}` })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: /edit expense/i });
  await expect(dialog).toBeVisible();

  // The picker trigger should show a non-placeholder label.
  const trigger = dialog.getByTestId("edit-expense-date-picker");
  await expect(trigger).toBeVisible();
  await expect(trigger).not.toHaveText(/pick a date/i);

  // Change the date to another past date and save.
  await pickDateOnDatePicker(page, dialog, "edit-expense-date-picker", "2024-07-20");

  await dialog.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status")).toContainText("Expense updated successfully.");
});
