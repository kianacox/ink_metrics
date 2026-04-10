import { fetchSessionsPage } from "./fetch-sessions-page";
import { getDateRangeStartUtcIso } from "@/lib/timezones";

jest.mock("@/lib/timezones", () => ({
  ...jest.requireActual("@/lib/timezones"),
  getDateRangeStartUtcIso: jest.fn(),
}));

const mockedGetDateRangeStartUtcIso = jest.mocked(getDateRangeStartUtcIso);

interface MockRowsQuery {
  eq: jest.Mock;
  order: jest.Mock;
  gte: jest.Mock;
  ilike: jest.Mock;
  range: jest.Mock;
}

interface MockCountQuery {
  eq: jest.Mock;
  gte: jest.Mock;
  ilike: jest.Mock;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { count: number; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

interface MockVersionQuery {
  eq: jest.Mock;
  lte: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
}

function createRowsQuery(rows: unknown[] = []): MockRowsQuery {
  const query: Partial<MockRowsQuery> = {};
  query.eq = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.gte = jest.fn(() => query);
  query.ilike = jest.fn(() => query);
  query.range = jest.fn().mockResolvedValue({ data: rows, error: null });
  return query as MockRowsQuery;
}

function createCountQuery(count = 0): MockCountQuery {
  const query: Partial<MockCountQuery> = {};
  query.eq = jest.fn(() => query);
  query.gte = jest.fn(() => query);
  query.ilike = jest.fn(() => query);
  query.then = (onfulfilled, onrejected) =>
    Promise.resolve({ count, error: null }).then(onfulfilled, onrejected);
  return query as MockCountQuery;
}

function createVersionQuery(
  row: {
    compensation_version_id: string;
    pay_chair_rent: boolean;
    rent_type: string | null;
    fixed_frequency: string | null;
    fixed_amount_minor: number | null;
    commission_rate_bps: number | null;
    commission_capped: boolean | null;
    commission_cap_frequency: string | null;
    commission_cap_amount_minor: number | null;
  } | null,
): MockVersionQuery {
  const query: Partial<MockVersionQuery> = {};
  query.eq = jest.fn(() => query);
  query.lte = jest.fn(() => query);
  query.or = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.limit = jest.fn().mockResolvedValue({ data: row ? [row] : [], error: null });
  return query as MockVersionQuery;
}

describe("fetchSessionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDateRangeStartUtcIso.mockReturnValue("2026-03-01T00:00:00.000Z");
  });

  it("applies date range boundaries to rows and count queries", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-1",
        price: 5000,
        session_duration: 60,
        session_at: "2026-03-12T10:00:00.000Z",
        through_ads: true,
        created_at: "2026-03-12T10:00:00.000Z",
        clients: { name: "Alice" },
      },
    ]);
    const countQuery = createCountQuery(1);
    const rowsSelect = jest.fn(() => rowsQuery);
    const countSelect = jest.fn(() => countQuery);

    const from = jest
      .fn()
      .mockReturnValueOnce({ select: rowsSelect })
      .mockReturnValueOnce({ select: countSelect });

    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "Europe/London",
      searchQuery: "",
      sortField: "date",
      pageIndex: 0,
      pageSize: 25,
      dateRange: "last30Days",
    });

    expect(mockedGetDateRangeStartUtcIso).toHaveBeenCalledWith({
      preset: "last30Days",
      timezone: "Europe/London",
    });
    expect(rowsSelect).toHaveBeenCalledWith(expect.stringContaining("through_ads"));
    expect(rowsQuery.gte).toHaveBeenCalledWith("session_at", "2026-03-01T00:00:00.000Z");
    expect(countQuery.gte).toHaveBeenCalledWith("session_at", "2026-03-01T00:00:00.000Z");
    expect(result.totalCount).toBe(1);
  });

  it("does not apply gte filter for all-time preset", async () => {
    mockedGetDateRangeStartUtcIso.mockReturnValue(null);
    const rowsQuery = createRowsQuery([]);
    const countQuery = createCountQuery(0);
    const from = jest
      .fn()
      .mockReturnValueOnce({ select: jest.fn(() => rowsQuery) })
      .mockReturnValueOnce({ select: jest.fn(() => countQuery) });
    const supabase = { from } as never;

    await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "Europe/London",
      searchQuery: "",
      sortField: "date",
      pageIndex: 0,
      pageSize: 25,
      dateRange: "allTime",
    });

    expect(rowsQuery.gte).not.toHaveBeenCalled();
    expect(countQuery.gte).not.toHaveBeenCalled();
  });

  it("throws when non-allTime boundary cannot be computed", async () => {
    mockedGetDateRangeStartUtcIso.mockReturnValue(null);
    const rowsQuery = createRowsQuery([]);
    const countQuery = createCountQuery(0);
    const from = jest
      .fn()
      .mockReturnValueOnce({ select: jest.fn(() => rowsQuery) })
      .mockReturnValueOnce({ select: jest.fn(() => countQuery) });
    const supabase = { from } as never;

    await expect(
      fetchSessionsPage({
        supabase,
        userId: "user-1",
        reportingTimezone: "Europe/London",
        searchQuery: "",
        sortField: "date",
        pageIndex: 0,
        pageSize: 25,
        dateRange: "last90Days",
      }),
    ).rejects.toThrow("Could not compute date range boundaries.");
  });

  it("hydrates missing compensation version rows by session_at when needed", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-1",
        price: 5000,
        session_duration: 60,
        session_at: "2026-03-12T10:00:00.000Z",
        created_at: "2026-03-12T10:00:00.000Z",
        compensation_version_id: null,
        artist_compensation_versions: null,
        clients: { name: "Alice" },
      },
    ]);
    const countQuery = createCountQuery(1);
    const versionQuery = createVersionQuery({
      compensation_version_id: "cv-1",
      pay_chair_rent: true,
      rent_type: "fixed",
      fixed_frequency: "weekly",
      fixed_amount_minor: 15000,
      commission_rate_bps: null,
      commission_capped: null,
      commission_cap_frequency: null,
      commission_cap_amount_minor: null,
    });

    const from = jest
      .fn()
      .mockReturnValueOnce({ select: jest.fn(() => rowsQuery) })
      .mockReturnValueOnce({ select: jest.fn(() => countQuery) })
      .mockReturnValueOnce({ select: jest.fn(() => versionQuery) });
    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "Europe/London",
      searchQuery: "",
      sortField: "date",
      pageIndex: 0,
      pageSize: 25,
      dateRange: "last30Days",
    });

    expect(versionQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(versionQuery.lte).toHaveBeenCalledWith("effective_from", "2026-03-12T10:00:00.000Z");
    expect(result.rows[0]?.compensation_version_id).toBe("cv-1");
  });
});
