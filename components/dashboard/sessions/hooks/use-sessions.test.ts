import { act, renderHook, waitFor } from "@testing-library/react";
import { useSessions } from "./use-sessions";
import { createClient } from "@/lib/supabase/client";
import { fetchSessionsPage } from "@/lib/sessions/fetch-sessions-page";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/sessions/fetch-sessions-page", () => ({
  fetchSessionsPage: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);
const mockedFetchSessionsPage = jest.mocked(fetchSessionsPage);

describe("useSessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a load error when user is not signed in", async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });

    mockedCreateClient.mockReturnValue({
      auth: { getUser },
    } as never);

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
    expect(mockedFetchSessionsPage).not.toHaveBeenCalled();
  });

  it("uses cached user id on reload and does not re-fetch auth user", async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const profileLimit = jest.fn().mockResolvedValue({
      data: [{ default_currency: "USD" }],
      error: null,
    });
    const profileEq = jest.fn().mockReturnValue({ limit: profileLimit });
    const profileSelect = jest.fn().mockReturnValue({ eq: profileEq });
    const from = jest.fn().mockImplementation((tableName: string) => {
      if (tableName !== "profiles") {
        throw new Error(`Unexpected table: ${tableName}`);
      }
      return { select: profileSelect };
    });

    mockedCreateClient.mockReturnValue({
      auth: { getUser },
      from,
    } as never);

    mockedFetchSessionsPage.mockResolvedValue({
      rows: [],
      totalCount: 0,
      hasNextPage: false,
    });

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

    const getUserCallsAfterInitialLoad = getUser.mock.calls.length;
    await act(async () => {
      await result.current.reload();
    });

    expect(getUser.mock.calls.length).toBe(getUserCallsAfterInitialLoad);
    expect(mockedFetchSessionsPage).toHaveBeenCalledTimes(2);
  });
});
