import { act, renderHook, waitFor } from "@testing-library/react";
import { useSessions } from "./use-sessions";
import { createWrapper } from "@/lib/test-utils/query-wrapper";

const MOCK_PREFERENCES = {
  defaultCurrency: "USD",
  reportingTimezone: "UTC",
};

const MOCK_PAGE = {
  data: [],
  nextCursor: null,
  hasNextPage: false,
};

describe("useSessions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("exposes defaultCurrency and reportingTimezone from preferences", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_PAGE) }) as jest.Mock;

    const { result } = renderHook(
      () => useSessions({ searchQuery: "", sortField: "date", dateRange: "allTime" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.defaultCurrency).toBe("USD");
    expect(result.current.reportingTimezone).toBe("UTC");
  });

  it("caches preferences and does not re-fetch them on refetch", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_PAGE) }) as jest.Mock;

    const { result } = renderHook(
      () => useSessions({ searchQuery: "", sortField: "date", dateRange: "allTime" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const fetchCallsAfterInitialLoad = (global.fetch as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(fetchCallsAfterInitialLoad);
    });

    const newPreferencesCalls = (global.fetch as jest.Mock).mock.calls
      .slice(fetchCallsAfterInitialLoad)
      .filter((call: unknown[]) => (call[0] as string).includes("/api/preferences"));

    expect(newPreferencesCalls).toHaveLength(0);
  });
});
