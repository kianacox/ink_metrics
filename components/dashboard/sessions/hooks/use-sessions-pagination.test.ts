import { act, renderHook, waitFor } from "@testing-library/react";
import { useSessionsPagination } from "./use-sessions-pagination";
import type { FetchSessionsPageResult } from "@/lib/sessions/models";

describe("useSessionsPagination", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("does not fetch another page when hasNextPage is false", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          nextCursor: null,
          hasNextPage: false,
        } satisfies FetchSessionsPageResult),
    }) as jest.Mock;

    const ensureSessionPreferencesLoaded = async () => ({
      reportingTimezone: "UTC",
    });
    const getCurrentReportingTimezone = () => "UTC";

    const { result } = renderHook(() =>
      useSessionsPagination({
        searchQuery: "",
        sortField: "date",
        dateRange: "allTime",
        pageSize: 25,
        ensureSessionPreferencesLoaded,
        getCurrentReportingTimezone,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the latest reload result when requests resolve out of order", async () => {
    let resolveFirst: ((value: Response) => void) | null = null;
    let resolveSecond: ((value: Response) => void) | null = null;

    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });

    const makeResponse = (result: FetchSessionsPageResult): Response =>
      ({
        ok: true,
        json: () => Promise.resolve(result),
      }) as Response;

    global.fetch = jest
      .fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise) as jest.Mock;

    const ensureSessionPreferencesLoaded = async () => ({
      reportingTimezone: "UTC",
    });
    const getCurrentReportingTimezone = () => "UTC";

    const { result } = renderHook(() =>
      useSessionsPagination({
        searchQuery: "",
        sortField: "date",
        dateRange: "allTime",
        pageSize: 25,
        ensureSessionPreferencesLoaded,
        getCurrentReportingTimezone,
      }),
    );

    let secondReloadPromise: Promise<void> | null = null;
    await act(async () => {
      secondReloadPromise = result.current.reload();
    });

    await act(async () => {
      resolveSecond?.(
        makeResponse({
          data: [
            {
              session_id: "session-2",
              price: 2000,
              session_at: "2026-04-09",
              clients: { name: "Bob" },
            },
          ],
          nextCursor: null,
          hasNextPage: false,
        }),
      );
      await Promise.resolve();
    });

    await act(async () => {
      await secondReloadPromise;
    });

    await act(async () => {
      resolveFirst?.(
        makeResponse({
          data: [
            {
              session_id: "session-1",
              price: 1000,
              session_at: "2026-04-08",
              clients: { name: "Alice" },
            },
          ],
          nextCursor: null,
          hasNextPage: false,
        }),
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.sessions[0]?.id).toBe("session-2");
    });
  });
});
