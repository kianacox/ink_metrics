import { fetchExpensesPage } from "./fetch-expenses-page";
import { decodeCompositeCursor } from "@/lib/pagination/cursor";

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
  gte: jest.Mock;
  order: jest.Mock;
  or: jest.Mock;
  limit: jest.Mock;
  then: <TResult1 = unknown, TResult2 = never>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

interface RangeQuery {
  eq: jest.Mock;
  gte: jest.Mock;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

function createPageQuery(rows: unknown[] = []): PageQuery {
  const q: Partial<PageQuery> = {};
  q.eq = jest.fn(() => q);
  q.in = jest.fn(() => q);
  q.gte = jest.fn(() => q);
  q.order = jest.fn(() => q);
  q.or = jest.fn(() => q);
  q.limit = jest.fn(() => q);
  q.then = (onfulfilled, onrejected) =>
    Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
  return q as PageQuery;
}

function createPageQueryError(message: string): PageQuery {
  const q: Partial<PageQuery> = {};
  q.eq = jest.fn(() => q);
  q.in = jest.fn(() => q);
  q.gte = jest.fn(() => q);
  q.order = jest.fn(() => q);
  q.or = jest.fn(() => q);
  q.limit = jest.fn(() => q);
  q.then = (onfulfilled, onrejected) =>
    Promise.resolve({ data: null, error: { message } }).then(onfulfilled, onrejected);
  return q as PageQuery;
}

function createRangeQuery(rows: Array<{ amount_minor: number }> = []): RangeQuery {
  const resolveData = { data: rows, error: null };
  const q: Partial<RangeQuery> = {};
  q.eq = jest.fn(() => q);
  q.gte = jest.fn().mockResolvedValue(resolveData);
  q.then = (onfulfilled, onrejected) =>
    Promise.resolve(resolveData).then(onfulfilled, onrejected);
  return q as RangeQuery;
}

function buildSupabase(pageQuery: PageQuery, rangeQuery: RangeQuery) {
  const from = jest
    .fn()
    .mockReturnValueOnce({ select: jest.fn(() => pageQuery) })
    .mockReturnValueOnce({ select: jest.fn(() => rangeQuery) });
  return { from } as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchExpensesPage", () => {
  it("maps DB rows to ExpenseListItem shape", async () => {
    const row = { ...BASE_ROW };
    const supabase = buildSupabase(createPageQuery([row]), createRangeQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
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
    const pageQuery = createPageQuery([]);
    const supabase = buildSupabase(pageQuery, createRangeQuery([]));

    await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: ["ink", "needles"],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(pageQuery.in).toHaveBeenCalledWith("category", ["ink", "needles"]);
  });

  it("does not apply category filter when categories array is empty", async () => {
    const pageQuery = createPageQuery([]);
    const supabase = buildSupabase(pageQuery, createRangeQuery([]));

    await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(pageQuery.in).not.toHaveBeenCalled();
  });

  it("detects hasNextPage when rows returned exceeds pageSize", async () => {
    // We fetch pageSize + 1 rows to detect a next page
    const rows = Array.from({ length: 26 }, (_, i) => ({ ...BASE_ROW, expense_id: `exp-${i}` }));
    const supabase = buildSupabase(createPageQuery(rows), createRangeQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(result.hasNextPage).toBe(true);
    expect(result.data).toHaveLength(25);
    expect(result.nextCursor).not.toBeNull();
  });

  it("sets hasNextPage to false when rows count does not exceed pageSize", async () => {
    const rows = [BASE_ROW];
    const supabase = buildSupabase(createPageQuery(rows), createRangeQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(result.hasNextPage).toBe(false);
  });

  it("sums rangeTotalMinor from the month query", async () => {
    const supabase = buildSupabase(createPageQuery([]), createRangeQuery([{ amount_minor: 500 }, { amount_minor: 750 }]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(result.rangeTotalMinor).toBe(1250);
  });

  it("returns zero rangeTotalMinor when no month rows", async () => {
    const supabase = buildSupabase(createPageQuery([]), createRangeQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(result.rangeTotalMinor).toBe(0);
  });

  it("throws when the page query returns an error", async () => {
    const supabase = buildSupabase(createPageQueryError("DB failure"), createRangeQuery([]));

    await expect(
      fetchExpensesPage({
        supabase,
        userId: "user-1",
        categories: [],
        dateRange: "allTime",
        reportingTimezone: "UTC",
        cursor: null,
        limit: 25,
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
    const supabase = buildSupabase(createPageQuery([row]), createRangeQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(result.data[0]?.receiptPath).toBe("user-1/exp-1/receipt.jpg");
    expect(result.data[0]?.receiptMimeType).toBe("image/jpeg");
    expect(result.data[0]?.receiptSizeBytes).toBe(204800);
  });

  it("applies date range start filter when dateRange is not allTime", async () => {
    const pageQuery = createPageQuery([]);
    const supabase = buildSupabase(pageQuery, createRangeQuery([]));

    await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "last30Days",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(pageQuery.gte).toHaveBeenCalledWith("date_purchased", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("does not apply date range start filter for allTime", async () => {
    const pageQuery = createPageQuery([]);
    const supabase = buildSupabase(pageQuery, createRangeQuery([]));

    await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: null,
      limit: 25,
    });

    expect(pageQuery.gte).not.toHaveBeenCalled();
  });

  it("applies composite cursor filter and serializes nextCursor", async () => {
    const pageQuery = createPageQuery([
      { ...BASE_ROW, expense_id: "exp-2", date_purchased: "2026-03-20" },
      { ...BASE_ROW, expense_id: "exp-1", date_purchased: "2026-03-19" },
    ]);
    const supabase = buildSupabase(pageQuery, createRangeQuery([]));

    const result = await fetchExpensesPage({
      supabase,
      userId: "user-1",
      categories: [],
      dateRange: "allTime",
      reportingTimezone: "UTC",
      cursor: { sortValue: "2026-03-21", id: "exp-3" },
      limit: 1,
    });

    expect(pageQuery.or).toHaveBeenCalledWith(
      'date_purchased.lt."2026-03-21",and(date_purchased.eq."2026-03-21",expense_id.lt."exp-3")',
    );
    expect(decodeCompositeCursor(result.nextCursor)).toEqual({
      sortValue: "2026-03-20",
      id: "exp-2",
    });
  });
});
