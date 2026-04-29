import { renderHook, waitFor, act } from "@testing-library/react";
import { useSessionsPagination } from "./use-sessions-pagination";
import { createWrapper } from "@/lib/test-utils/query-wrapper";

const MOCK_PREFERENCES = {
  defaultCurrency: "GBP",
  reportingTimezone: "Europe/London",
};

const MOCK_PAGE_1 = {
  data: [
    { session_id: "session-1", price: 1000, session_at: "2026-04-08", clients: { name: "Alice" } },
    { session_id: "session-2", price: 2000, session_at: "2026-04-07", clients: { name: "Bob" } },
  ],
  nextCursor: "cursor-abc",
  hasNextPage: true,
};

const MOCK_PAGE_2 = {
  data: [
    { session_id: "session-3", price: 3000, session_at: "2026-04-06", clients: { name: "Charlie" } },
  ],
  nextCursor: null,
  hasNextPage: false,
};

describe("useSessionsPagination", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("fetches preferences then sessions on mount", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PAGE_1) }) as jest.Mock;

    const { result } = renderHook(
      () => useSessionsPagination({ searchQuery: "", sortField: "date", dateRange: "allTime", pageSize: 25 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.sessions[0].id).toBe("session-1");
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch sessions until preferences resolve", async () => {
    let resolvePrefs!: (value: unknown) => void;
    const prefsPromise = new Promise((res) => { resolvePrefs = res; });

    global.fetch = jest
      .fn()
      .mockReturnValueOnce({ ok: true, json: () => prefsPromise })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_PAGE_1) }) as jest.Mock;

    const { result } = renderHook(
      () => useSessionsPagination({ searchQuery: "", sortField: "date", dateRange: "allTime", pageSize: 25 }),
      { wrapper: createWrapper() },
    );

    expect(result.current.sessions).toHaveLength(0);

    await act(async () => {
      resolvePrefs(MOCK_PREFERENCES);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(2);
  });

  it("does not fetch another page when hasNextPage is false", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...MOCK_PAGE_1, nextCursor: null, hasNextPage: false }),
      }) as jest.Mock;

    const { result } = renderHook(
      () => useSessionsPagination({ searchQuery: "", sortField: "date", dateRange: "allTime", pageSize: 25 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.loadMore();

    expect(global.fetch).toHaveBeenCalledTimes(2); // prefs + 1 sessions page, no extra
  });

  it("appends sessions when loading more", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PAGE_1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PAGE_2) }) as jest.Mock;

    const { result } = renderHook(
      () => useSessionsPagination({ searchQuery: "", sortField: "date", dateRange: "allTime", pageSize: 25 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });

    expect(result.current.sessions).toHaveLength(3);
    expect(result.current.sessions[2].id).toBe("session-3");
    expect(result.current.hasNextPage).toBe(false);
  });
});
