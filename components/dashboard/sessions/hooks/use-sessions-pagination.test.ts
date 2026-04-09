import { act, renderHook, waitFor } from "@testing-library/react";
import { createClient } from "@/lib/supabase/client";
import { fetchSessionsPage } from "@/lib/sessions/fetch-sessions-page";
import { useSessionsPagination } from "./use-sessions-pagination";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/sessions/fetch-sessions-page", () => ({
  fetchSessionsPage: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);
const mockedFetchSessionsPage = jest.mocked(fetchSessionsPage);

describe("useSessionsPagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateClient.mockReturnValue({} as never);
  });

  it("does not fetch another page when hasNextPage is false", async () => {
    mockedFetchSessionsPage.mockResolvedValue({
      rows: [],
      totalCount: 0,
      hasNextPage: false,
    });

    const ensureSessionPreferencesLoaded = async () => ({
      userId: "user-123",
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

    expect(mockedFetchSessionsPage).toHaveBeenCalledTimes(1);
  });

  it("keeps the latest reload result when requests resolve out of order", async () => {
    let resolveFirst:
      | ((value: Awaited<ReturnType<typeof fetchSessionsPage>>) => void)
      | null = null;
    let resolveSecond:
      | ((value: Awaited<ReturnType<typeof fetchSessionsPage>>) => void)
      | null = null;

    const firstPromise = new Promise<Awaited<ReturnType<typeof fetchSessionsPage>>>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<Awaited<ReturnType<typeof fetchSessionsPage>>>((resolve) => {
      resolveSecond = resolve;
    });

    mockedFetchSessionsPage
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const ensureSessionPreferencesLoaded = async () => ({
      userId: "user-123",
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
      resolveSecond?.({
        rows: [
          {
            session_id: "session-2",
            price: 2000,
            session_duration: 30,
            session_at: "2026-04-09T10:00:00.000Z",
            clients: { name: "Bob" },
          },
        ],
        totalCount: 1,
        hasNextPage: false,
      });
      await Promise.resolve();
    });

    await act(async () => {
      await secondReloadPromise;
    });

    await act(async () => {
      resolveFirst?.({
        rows: [
          {
            session_id: "session-1",
            price: 1000,
            session_duration: 20,
            session_at: "2026-04-08T10:00:00.000Z",
            clients: { name: "Alice" },
          },
        ],
        totalCount: 1,
        hasNextPage: false,
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.sessions[0]?.id).toBe("session-2");
    });
  });
});
