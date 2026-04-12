import type { SupabaseClient } from "@supabase/supabase-js";

export type ExpenseCategory =
  | "ink"
  | "cartridges"
  | "needles"
  | "machines"
  | "other_equipment"
  | "travel"
  | "miscellaneous";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "ink",
  "cartridges",
  "needles",
  "machines",
  "other_equipment",
  "travel",
  "miscellaneous",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ink: "Ink",
  cartridges: "Cartridges",
  needles: "Needles",
  machines: "Machines",
  other_equipment: "Other equipment",
  travel: "Travel",
  miscellaneous: "Miscellaneous",
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
  pageIndex: number;
  pageSize: number;
}

export interface FetchExpensesPageResult {
  rows: ExpenseListItem[];
  hasNextPage: boolean;
  totalCount: number;
}
