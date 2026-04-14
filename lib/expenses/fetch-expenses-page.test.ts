import { fetchExpensesPage } from "./fetch-expenses-page";

const BASE_ROW = {
  expense_id: "exp-1",
  user_id: "user-1",
  item: "Black ink",
  category: "ink",
  amount_minor: 1000,
  currency_code: "GBP",
  date_purchased: "2026-03-15",
  receipt_path: null,
  receipt_mime_type: null,
  receipt_size_bytes: null,
  created_at: "2026-03-15T10:00:00.000Z",
  updated_at: "2026-03-15T10:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Supabase mock builders
// ---------------------------------------------------------------------------

interface PageQuery {
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
}

interface MonthQuery {
  eq: jest.Mock;
  gte: jest.Mock;
}

function createPageQuery(rows: unknown[] = [], count = 0): PageQuery {
  const q: Partial<PageQuery> = {};
  q.eq = jest.fn(() => q);
  q.in = jest.fn(() => q);
  q.order = jest.fn(() => q);
  q.range = jest.fn().mockResolvedValue({ data: rows, count, error: null });
  return q as PageQuery;
}

function createPageQueryError(message: string): PageQuery {
  const q: Partial<PageQuery> = {};
  q.eq = jest.fn(() => q);
  q.in = jest.fn(() => q);
  q.order = jest.fn(() => q);
  q.range = jest.fn().mockResolvedValue({ data: null, count: null, error: { message } });
  return q as PageQuery;
}

function createMonthQuery(rows: Array<{ amount_minor: number }> = []): MonthQuery {
  const q: Partial<MonthQuery> = {};
  q.eq = jest.fn(() => q);
  q.gte = jest.fn().mockResolvedValue({ data: rows, error: null });
  return q as MonthQuery;
}

function buildSupabase(pageQuery: PageQuery, monthQuery: MonthQuery) {
  const from = jest
    .fn()
    .mockReturnValueOnce({ select: jest.fn(() => pageQuery) })
    .mockReturnValueOnce({ select: jest.fn(() => monthQuery) });
  return { from } as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchExpensesPage", () => {
  it("maps DB rows to ExpenseListItem shape", async () => {
    const row = { ...BASE_ROW };
    const supabase = buildSupabase(createPageQuery([row], 1), createMonthQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      id: "exp-1",
      item: "Black ink",
      category: "ink",
      amountMinor: 1000,
      currencyCode: "GBP",
      datePurchased: "2026-03-15",
      receiptPath: null,
      receiptMimeType: null,
      receiptSizeBytes: null,
      createdAt: "2026-03-15T10:00:00.000Z",
    });
  });

  it("applies category filter when categories are provided", async () => {
    const pageQuery = createPageQuery([], 0);
    const supabase = buildSupabase(pageQuery, createMonthQuery([]));

    await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: ["ink", "needles"],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(pageQuery.in).toHaveBeenCalledWith("category", ["ink", "needles"]);
  });

  it("does not apply category filter when categories array is empty", async () => {
    const pageQuery = createPageQuery([], 0);
    const supabase = buildSupabase(pageQuery, createMonthQuery([]));

    await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(pageQuery.in).not.toHaveBeenCalled();
  });

  it("detects hasNextPage when rows returned exceeds pageSize", async () => {
    // We fetch pageSize + 1 rows to detect a next page
    const rows = Array.from({ length: 26 }, (_, i) => ({ ...BASE_ROW, expense_id: `exp-${i}` }));
    const supabase = buildSupabase(createPageQuery(rows, 26), createMonthQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.hasNextPage).toBe(true);
    expect(result.rows).toHaveLength(25);
  });

  it("sets hasNextPage to false when rows count does not exceed pageSize", async () => {
    const rows = [BASE_ROW];
    const supabase = buildSupabase(createPageQuery(rows, 1), createMonthQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.hasNextPage).toBe(false);
  });

  it("sums currentMonthTotalMinor from the month query", async () => {
    const supabase = buildSupabase(
      createPageQuery([], 0),
      createMonthQuery([{ amount_minor: 500 }, { amount_minor: 750 }]),
    );

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.currentMonthTotalMinor).toBe(1250);
  });

  it("returns zero currentMonthTotalMinor when no month rows", async () => {
    const supabase = buildSupabase(createPageQuery([], 0), createMonthQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.currentMonthTotalMinor).toBe(0);
  });

  it("returns totalCount from the count field", async () => {
    const supabase = buildSupabase(createPageQuery([], 42), createMonthQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.totalCount).toBe(42);
  });

  it("throws when the page query returns an error", async () => {
    const supabase = buildSupabase(createPageQueryError("DB failure"), createMonthQuery([]));

    await expect(
      fetchExpensesPage({
        supabase,
        userId: "user-1",
        categories: [],
        pageIndex: 0,
        pageSize: 25,
      }),
    ).rejects.toThrow("DB failure");
  });

  it("handles receipt fields on DB rows", async () => {
    const row = {
      ...BASE_ROW,
      receipt_path: "user-1/exp-1/receipt.jpg",
      receipt_mime_type: "image/jpeg",
      receipt_size_bytes: 204800,
    };
    const supabase = buildSupabase(createPageQuery([row], 1), createMonthQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      pageIndex: 0,
      pageSize: 25,
    });

    expect(result.rows[0]?.receiptPath).toBe("user-1/exp-1/receipt.jpg");
    expect(result.rows[0]?.receiptMimeType).toBe("image/jpeg");
    expect(result.rows[0]?.receiptSizeBytes).toBe(204800);
  });
});
