import { fetchSessionsPage } from "./fetch-sessions-page";
import { getDateRangeStartDate } from "@/lib/timezones";
import { decodeCompositeCursor } from "@/lib/pagination/cursor";

jest.mock("@/lib/timezones", () => ({
  ...jest.requireActual("@/lib/timezones"),
  getDateRangeStartDate: jest.fn(),
}));

const mockedGetDateRangeStartDate = jest.mocked(getDateRangeStartDate);

interface MockRowsQuery {
  eq: jest.Mock;
  order: jest.Mock;
  gte: jest.Mock;
  ilike: jest.Mock;
  or: jest.Mock;
  limit: jest.Mock;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
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
  query.or = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.then = (onfulfilled, onrejected) =>
    Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
  return query as MockRowsQuery;
}

interface MockAnnotateQuery {
  eq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  select: jest.Mock;
}

function createAnnotateQuery(rows: { client_id: string; session_at: string; created_at: string }[]): MockAnnotateQuery {
  const query: Partial<MockAnnotateQuery> = {};
  query.eq = jest.fn(() => query);
  query.in = jest.fn(() => query);
  query.order = jest.fn()
    .mockReturnValueOnce(query)
    .mockReturnValueOnce(query)
    .mockResolvedValueOnce({ data: rows, error: null });
  query.select = jest.fn(() => query);
  return query as MockAnnotateQuery;
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
    mockedGetDateRangeStartDate.mockReturnValue("2026-03-01");
  });

  it("applies date range boundaries to rows query", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-1",
        price: 5000,
        session_at: "2026-03-12",
        through_ads: true,
        created_at: "2026-03-12T10:00:00.000Z",
        clients: { name: "Alice" },
      },
    ]);
    const rowsSelect = jest.fn(() => rowsQuery);

    const from = jest.fn().mockReturnValueOnce({ select: rowsSelect });

    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "Europe/London",
      searchQuery: "",
      sortField: "date",
      cursor: null,
      limit: 25,
      dateRange: "last30Days",
    });

    expect(mockedGetDateRangeStartDate).toHaveBeenCalledWith({
      preset: "last30Days",
      timezone: "Europe/London",
    });
    expect(rowsSelect).toHaveBeenCalledWith(expect.stringContaining("through_ads"));
    expect(rowsQuery.gte).toHaveBeenCalledWith("session_at", "2026-03-01");
    expect(result.data).toHaveLength(1);
  });

  it("does not apply gte filter for all-time preset", async () => {
    mockedGetDateRangeStartDate.mockReturnValue(null);
    const rowsQuery = createRowsQuery([]);
    const from = jest.fn().mockReturnValueOnce({ select: jest.fn(() => rowsQuery) });
    const supabase = { from } as never;

    await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "Europe/London",
      searchQuery: "",
      sortField: "date",
      cursor: null,
      limit: 25,
      dateRange: "allTime",
    });

    expect(rowsQuery.gte).not.toHaveBeenCalled();
  });

  it("throws when non-allTime boundary cannot be computed", async () => {
    mockedGetDateRangeStartDate.mockReturnValue(null);
    const from = jest.fn();
    const supabase = { from } as never;

    await expect(
      fetchSessionsPage({
        supabase,
        userId: "user-1",
        reportingTimezone: "Europe/London",
        searchQuery: "",
        sortField: "date",
        cursor: null,
        limit: 25,
        dateRange: "last90Days",
      }),
    ).rejects.toThrow("Could not compute date range boundaries.");
  });

  it("applies composite cursor filter when cursor is present", async () => {
    const rowsQuery = createRowsQuery([]);
    const from = jest.fn().mockReturnValueOnce({ select: jest.fn(() => rowsQuery) });
    const supabase = { from } as never;

    await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "UTC",
      searchQuery: "",
      sortField: "date",
      cursor: { sortValue: "2026-03-12", id: "s-1" },
      limit: 25,
      dateRange: "allTime",
    });

    expect(rowsQuery.or).toHaveBeenCalledWith(
      'session_at.lt."2026-03-12",and(session_at.eq."2026-03-12",session_id.lt."s-1")',
    );
  });

  it("hydrates missing compensation version rows by session_at when needed", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-1",
        price: 5000,
        session_at: "2026-03-12",
        created_at: "2026-03-12T10:00:00.000Z",
        compensation_version_id: null,
        artist_compensation_versions: null,
        clients: { name: "Alice" },
      },
    ]);
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
      .mockReturnValueOnce({ select: jest.fn(() => versionQuery) });
    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "Europe/London",
      searchQuery: "",
      sortField: "date",
      cursor: null,
      limit: 1,
      dateRange: "last30Days",
    });

    expect(versionQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(versionQuery.lte).toHaveBeenCalledWith("effective_from", "2026-03-12");
    expect(result.data[0]?.compensation_version_id).toBe("cv-1");
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when extra row is present", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-2",
        price: 5000,
        session_at: "2026-03-12",
        through_ads: true,
        created_at: "2026-03-12T10:00:00.000Z",
        clients: { name: "Alice" },
      },
      {
        session_id: "s-1",
        price: 4500,
        session_at: "2026-03-11",
        through_ads: false,
        created_at: "2026-03-11T10:00:00.000Z",
        clients: { name: "Bob" },
      },
    ]);
    const from = jest.fn().mockReturnValueOnce({ select: jest.fn(() => rowsQuery) });
    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "UTC",
      searchQuery: "",
      sortField: "date",
      cursor: null,
      limit: 1,
      dateRange: "allTime",
    });

    expect(result.hasNextPage).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.nextCursor).not.toBeNull();
    expect(decodeCompositeCursor(result.nextCursor)).toEqual({
      sortValue: "2026-03-12",
      id: "s-2",
    });
  });

  it("marks the most recent session for a client as isLatestForClient", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-2",
        client_id: "c-1",
        price: 5000,
        session_at: "2026-03-12",
        created_at: "2026-03-12T10:00:00.000Z",
        clients: { name: "Alice" },
      },
      {
        session_id: "s-1",
        client_id: "c-1",
        price: 4500,
        session_at: "2026-03-11",
        created_at: "2026-03-11T10:00:00.000Z",
        clients: { name: "Alice" },
      },
    ]);
    const annotateQuery = createAnnotateQuery([
      { client_id: "c-1", session_at: "2026-03-12", created_at: "2026-03-12T10:00:00.000Z" },
      { client_id: "c-1", session_at: "2026-03-11", created_at: "2026-03-11T10:00:00.000Z" },
    ]);

    const from = jest
      .fn()
      .mockReturnValueOnce({ select: jest.fn(() => rowsQuery) })
      .mockReturnValueOnce({ select: jest.fn(() => annotateQuery) });
    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "UTC",
      searchQuery: "",
      sortField: "date",
      cursor: null,
      limit: 25,
      dateRange: "allTime",
    });

    expect(result.data[0]?.is_latest_for_client).toBe(true);
    expect(result.data[1]?.is_latest_for_client).toBe(false);
  });

  it("marks session as latest when client has only one session", async () => {
    const rowsQuery = createRowsQuery([
      {
        session_id: "s-1",
        client_id: "c-1",
        price: 5000,
        session_at: "2026-03-12",
        created_at: "2026-03-12T10:00:00.000Z",
        clients: { name: "Alice" },
      },
    ]);
    const annotateQuery = createAnnotateQuery([
      { client_id: "c-1", session_at: "2026-03-12", created_at: "2026-03-12T10:00:00.000Z" },
    ]);

    const from = jest
      .fn()
      .mockReturnValueOnce({ select: jest.fn(() => rowsQuery) })
      .mockReturnValueOnce({ select: jest.fn(() => annotateQuery) });
    const supabase = { from } as never;

    const result = await fetchSessionsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "UTC",
      searchQuery: "",
      sortField: "date",
      cursor: null,
      limit: 25,
      dateRange: "allTime",
    });

    expect(result.data[0]?.is_latest_for_client).toBe(true);
  });
});
