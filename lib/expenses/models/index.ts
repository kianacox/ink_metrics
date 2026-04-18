import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompositeCursor, CursorPaginatedResult } from "@/lib/pagination/cursor";
import type { SessionDateRangePreset } from "@/lib/timezones";

// Const-object enum: string literals remain assignable to ExpenseCategory,
// and Object.values(ExpenseCategory) gives the canonical ordered array.
export const ExpenseCategory = {
  ink: "ink",
  cartridges: "cartridges",
  needles: "needles",
  machines: "machines",
  other_equipment: "other_equipment",
  travel: "travel",
  miscellaneous: "miscellaneous",
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = Object.values(ExpenseCategory);

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.ink]: "Ink",
  [ExpenseCategory.cartridges]: "Cartridges",
  [ExpenseCategory.needles]: "Needles",
  [ExpenseCategory.machines]: "Machines",
  [ExpenseCategory.other_equipment]: "Other equipment",
  [ExpenseCategory.travel]: "Travel",
  [ExpenseCategory.miscellaneous]: "Miscellaneous",
};

export interface ExpenseListItem {
  id: string;
  item: string;
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  datePurchased: string; // YYYY-MM-DD
  receiptPath: string | null;
  receiptMimeType: string | null;
  receiptSizeBytes: number | null;
  createdAt: string;
}

export interface ExpenseCreatePayload {
  item: string;
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  datePurchased: string;
}

export interface ExpenseUpdatePayload {
  item?: string;
  category?: ExpenseCategory;
  amountMinor?: number;
  currencyCode?: string;
  datePurchased?: string;
  receiptPath?: string;
  receiptMimeType?: string;
  receiptSizeBytes?: number;
}

export interface FetchExpensesPageParams {
  supabase: SupabaseClient;
  userId: string;
  categories: string[];
  dateRange: SessionDateRangePreset;
  reportingTimezone: string;
  cursor: CompositeCursor | null;
  limit: number;
}

export interface FetchExpensesPageResult extends CursorPaginatedResult<ExpenseListItem> {
  rangeTotalMinor: number;
}

// Hook types for useExpenses
export interface UseExpensesParams {
  selectedCategories: string[];
  dateRange?: SessionDateRangePreset;
  pageSize?: number;
}

export interface UseExpensesResult {
  expenses: ExpenseListItem[];
  rangeTotalMinor: number;
  defaultCurrency: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface ExpensesApiResponse {
  data: ExpenseListItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
  rangeTotalMinor: number;
}
