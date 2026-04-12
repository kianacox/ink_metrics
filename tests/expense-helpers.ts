import { expect, type Page } from "@playwright/test";

const CREATED_TOAST_TEXT = "Expense logged successfully.";
const UPDATED_TOAST_TEXT = "Expense updated successfully.";
const DELETED_TOAST_TEXT = "Expense deleted successfully.";

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
    await dialog.getByLabel("Date purchased").fill(input.datePurchased);
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
