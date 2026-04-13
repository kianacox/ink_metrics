import { expect, test } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";
import {
  clearCategoryFilters,
  createExpense,
  deleteExpenseFromExpensesPage,
  editExpenseFromExpensesPage,
  expectExpenseNotVisibleInTable,
  expectExpenseVisibleInTable,
  goToExpensesPage,
  openCreateExpenseModal,
  selectCategoryFilter,
} from "./expense-helpers";

function uniqueItem(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

// Fixed past date for deterministic tests
const PAST_DATE = "2024-06-15";

test.beforeEach(async ({ page }) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test("navigates to expenses page from desktop sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard");
  await page
    .getByRole("navigation", { name: /primary/i })
    .first()
    .getByRole("link", { name: /^expenses$/i })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/expenses/);
  await expect(page.getByRole("heading", { name: /^expenses$/i })).toBeVisible();
});

test("navigates to expenses page from mobile bottom nav", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page
    .getByRole("navigation", { name: /primary/i })
    .last()
    .getByRole("link", { name: /^expenses$/i })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/expenses/);
  await expect(page.getByRole("heading", { name: /^expenses$/i })).toBeVisible();
});

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

test("logs an expense and sees it in the table", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const item = uniqueItem("ink-refill");
  await goToExpensesPage(page);
  await createExpense(page, { item, category: "Ink", amount: "12.50", datePurchased: PAST_DATE });
  await expectExpenseVisibleInTable(page, item);
});

test("views multiple expenses on the expenses page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const item1 = uniqueItem("needles-box");
  const item2 = uniqueItem("travel-train");
  await goToExpensesPage(page);
  await createExpense(page, { item: item1, category: "Needles", amount: "8.00", datePurchased: PAST_DATE });
  await createExpense(page, { item: item2, category: "Travel", amount: "22.00", datePurchased: PAST_DATE });
  await expectExpenseVisibleInTable(page, item1);
  await expectExpenseVisibleInTable(page, item2);
});

test("edits an expense item name and amount", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const item = uniqueItem("cartridge-old");
  const updatedItem = uniqueItem("cartridge-new");
  await goToExpensesPage(page);
  await createExpense(page, { item, category: "Cartridges", amount: "5.00", datePurchased: PAST_DATE });
  await editExpenseFromExpensesPage(page, item, { item: updatedItem, amount: "6.50" });
  await expectExpenseVisibleInTable(page, updatedItem);
  await expectExpenseNotVisibleInTable(page, item);
});

test("deletes an expense", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const item = uniqueItem("misc-delete");
  await goToExpensesPage(page);
  await createExpense(page, { item, category: "Miscellaneous", amount: "3.00", datePurchased: PAST_DATE });
  await expectExpenseVisibleInTable(page, item);
  await deleteExpenseFromExpensesPage(page, item);
  await expectExpenseNotVisibleInTable(page, item);
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test("shows a validation error when creating an expense with no item name", async ({ page }) => {
  await goToExpensesPage(page);
  await openCreateExpenseModal(page);
  const dialog = page.getByRole("dialog", { name: /log an expense/i });
  // Fill amount and date but leave item blank
  await dialog.getByLabel(/amount/i).fill("10.00");
  await dialog.getByRole("button", { name: /log expense/i }).click();
  await expect(dialog.getByRole("status")).toContainText("Item name is required.");
});

test("shows a validation error when creating an expense with invalid amount", async ({ page }) => {
  await goToExpensesPage(page);
  await openCreateExpenseModal(page);
  const dialog = page.getByRole("dialog", { name: /log an expense/i });
  await dialog.getByLabel("Item name").fill("test item");
  await dialog.getByLabel(/amount/i).fill("not-a-number");
  await dialog.getByRole("button", { name: /log expense/i }).click();
  await expect(dialog.getByRole("status")).toContainText("valid");
});

// ---------------------------------------------------------------------------
// Category filtering
// ---------------------------------------------------------------------------

test("filters by one category", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const inkItem = uniqueItem("filter-ink");
  const needlesItem = uniqueItem("filter-needles");
  await goToExpensesPage(page);
  await createExpense(page, { item: inkItem, category: "Ink", amount: "5.00", datePurchased: PAST_DATE });
  await createExpense(page, { item: needlesItem, category: "Needles", amount: "3.00", datePurchased: PAST_DATE });

  await selectCategoryFilter(page, "Ink");

  await expectExpenseVisibleInTable(page, inkItem);
  await expectExpenseNotVisibleInTable(page, needlesItem);
});

test("filters by multiple categories", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const inkItem = uniqueItem("multi-ink");
  const needlesItem = uniqueItem("multi-needles");
  const travelItem = uniqueItem("multi-travel");
  await goToExpensesPage(page);
  await createExpense(page, { item: inkItem, category: "Ink", amount: "5.00", datePurchased: PAST_DATE });
  await createExpense(page, { item: needlesItem, category: "Needles", amount: "3.00", datePurchased: PAST_DATE });
  await createExpense(page, { item: travelItem, category: "Travel", amount: "20.00", datePurchased: PAST_DATE });

  await selectCategoryFilter(page, "Ink");
  await selectCategoryFilter(page, "Needles");

  await expectExpenseVisibleInTable(page, inkItem);
  await expectExpenseVisibleInTable(page, needlesItem);
  await expectExpenseNotVisibleInTable(page, travelItem);
});

test("clears all category filters", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const inkItem = uniqueItem("clear-ink");
  const travelItem = uniqueItem("clear-travel");
  await goToExpensesPage(page);
  await createExpense(page, { item: inkItem, category: "Ink", amount: "5.00", datePurchased: PAST_DATE });
  await createExpense(page, { item: travelItem, category: "Travel", amount: "20.00", datePurchased: PAST_DATE });

  await selectCategoryFilter(page, "Ink");
  await expectExpenseNotVisibleInTable(page, travelItem);

  await clearCategoryFilters(page);

  await expectExpenseVisibleInTable(page, inkItem);
  await expectExpenseVisibleInTable(page, travelItem);
});

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

test("logged-out user cannot POST to /api/expenses", async ({ page, request }) => {
  await page.context().clearCookies();
  const response = await request.post("/api/expenses", {
    data: {
      item: "Test",
      category: "ink",
      amountMinor: 100,
      currencyCode: "GBP",
      datePurchased: PAST_DATE,
    },
  });
  expect(response.status()).toBe(401);
});

test("logged-out user cannot access the expenses page", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/dashboard/expenses");
  await expect(page).not.toHaveURL(/\/dashboard\/expenses/);
});

// ---------------------------------------------------------------------------
// Mobile viewport
// ---------------------------------------------------------------------------

test("shows FAB and cards on mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const item = uniqueItem("mobile-expense");
  await goToExpensesPage(page);
  await expect(page.getByTestId("create-expense-fab")).toBeVisible();
  await createExpense(page, { item, category: "Miscellaneous", amount: "1.00", datePurchased: PAST_DATE });
  // Cards are visible on mobile (sm:hidden desktop table is hidden)
  await expect(page.locator(".grid.gap-3 >> text=" + item).first()).toBeVisible();
});
