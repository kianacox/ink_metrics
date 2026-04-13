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
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [pageResult, monthResult] = await Promise.all([
    (() => {
      let query = supabase
        .from("expenses")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      if (categories.length > 0) {
        query = query.in("category", categories);
      }

      return query
        .order("date_purchased", { ascending: false })
        .order("expense_id", { ascending: false })
        .range(pageIndex * pageSize, pageIndex * pageSize + pageSize);
    })(),
    supabase
      .from("expenses")
      .select("amount_minor")
      .eq("user_id", userId)
      .gte("date_purchased", monthStart),
  ]);

  if (pageResult.error) {
    throw new Error(pageResult.error.message ?? "Could not load expenses.");
  }

  const rows = (pageResult.data ?? []) as DbRow[];
  const hasNextPage = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize).map(mapDbRow);

  const monthRows = (monthResult.data ?? []) as Array<{ amount_minor: number }>;
  const currentMonthTotalMinor = monthRows.reduce(
    (sum, row) => sum + Number(row.amount_minor),
    0,
  );

  return {
    rows: pageRows,
    hasNextPage,
    totalCount: pageResult.count ?? 0,
    currentMonthTotalMinor,
  };
}
