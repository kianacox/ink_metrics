import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses/models";
import type { SessionDateRangePreset } from "@/lib/timezones";

/**
 * Whitelisted expenses-list query parameter values, plus parsing helpers.
 *
 * The expenses endpoint defaults to a `last90Days` window and intentionally
 * omits `thisMonth` from accepted presets. Centralising these rules keeps
 * the API handler focused on transport.
 */

export const EXPENSE_DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";

export const EXPENSE_VALID_DATE_RANGES: ReadonlySet<SessionDateRangePreset> =
  new Set<SessionDateRangePreset>(["last30Days", "last90Days", "yearToDate", "allTime"]);

export function isValidExpenseDateRange(value: unknown): value is SessionDateRangePreset {
  return (
    typeof value === "string" &&
    EXPENSE_VALID_DATE_RANGES.has(value as SessionDateRangePreset)
  );
}

export function parseExpenseDateRange(value: string | null): SessionDateRangePreset {
  return isValidExpenseDateRange(value) ? value : EXPENSE_DEFAULT_DATE_RANGE;
}

function isValidExpenseCategory(value: string): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(value as ExpenseCategory);
}

export function filterValidExpenseCategories(values: readonly string[]): ExpenseCategory[] {
  return values.filter(isValidExpenseCategory);
}
