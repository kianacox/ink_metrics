import { act, renderHook, waitFor } from "@testing-library/react";
import { useSessions } from "./use-sessions";

describe("useSessions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows a load error when preferences request fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    }) as jest.Mock;

    const { result } = renderHook(() =>
      useSessions({
        searchQuery: "",
        sortField: "date",
        dateRange: "allTime",
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Could not load sessions. Please try again.");
    expect(result.current.sessions).toEqual([]);
  });

  it("caches preferences and does not re-fetch them on reload", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ defaultCurrency: "USD", reportingTimezone: "UTC" }),
      })
      .mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            nextCursor: null,
            hasNextPage: false,
          }),
      }) as jest.Mock;

    const { result } = renderHook(() =>
      useSessions({
        searchQuery: "",
        sortField: "date",
        dateRange: "allTime",
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const fetchCallsAfterInitialLoad = (global.fetch as jest.Mock).mock.calls.length;

    await act(async () => {
      await result.current.reload();
    });

    // preferences fetch (/api/preferences) should not be called again
    const newFetchCalls = (global.fetch as jest.Mock).mock.calls
      .slice(fetchCallsAfterInitialLoad)
      .filter((call: unknown[]) => (call[0] as string).includes("/api/preferences"));

    expect(newFetchCalls).toHaveLength(0);
  });
});
