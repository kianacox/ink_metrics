import type {
  ExpenseCategory,
  ExpenseListItem,
  FetchExpensesPageParams,
  FetchExpensesPageResult,
} from "@/lib/expenses/models";

interface DbRow {
  expense_id: string;
  user_id: string;
  item: string;
  category: string;
  amount_minor: number;
  currency_code: string;
  date_purchased: string;
  receipt_path: string | null;
  receipt_mime_type: string | null;
  receipt_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

function mapDbRow(row: DbRow): ExpenseListItem {
  return {
    id: row.expense_id,
    item: row.item,
    category: row.category as ExpenseCategory,
    amountMinor: Number(row.amount_minor),
    currencyCode: row.currency_code,
    datePurchased: row.date_purchased,
    receiptPath: row.receipt_path ?? null,
    receiptMimeType: row.receipt_mime_type ?? null,
    receiptSizeBytes: row.receipt_size_bytes ?? null,
    createdAt: row.created_at,
  };
}

export async function fetchExpensesPage({
  supabase,
  userId,
  categories,
  pageIndex,
  pageSize,
}: FetchExpensesPageParams): Promise<FetchExpensesPageResult> {
  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (categories.length > 0) {
    query = query.in("category", categories);
  }

  query = query
    .order("date_purchased", { ascending: false })
    .order("expense_id", { ascending: false })
    .range(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message ?? "Could not load expenses.");
  }

  const rows = (data ?? []) as DbRow[];
  const hasNextPage = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize).map(mapDbRow);

  return {
    rows: pageRows,
    hasNextPage,
    totalCount: count ?? 0,
  };
}
