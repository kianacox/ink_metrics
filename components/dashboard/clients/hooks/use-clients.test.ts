import { renderHook, waitFor, act } from "@testing-library/react";
import { useClients } from "./use-clients";
import { createWrapper } from "@/lib/test-utils/query-wrapper";
import { ClientSortField } from "@/lib/clients/models";
import { SessionDateRangePreset } from "@/lib/timezones";

const MOCK_PREFERENCES = {
  defaultCurrency: "USD",
  reportingTimezone: "America/New_York",
};

const MOCK_CLIENTS_PAGE_1 = {
  data: [
    { id: "1", name: "Alice", contactInfo: null, sessionCount: 5, totalValue: 500 },
    { id: "2", name: "Bob", contactInfo: "bob@example.com", sessionCount: 3, totalValue: 300 },
  ],
  nextCursor: "cursor-abc",
  hasNextPage: true,
};

const MOCK_CLIENTS_PAGE_2 = {
  data: [
    { id: "3", name: "Charlie", contactInfo: null, sessionCount: 2, totalValue: 200 },
  ],
  nextCursor: null,
  hasNextPage: false,
};

const DEFAULT_PARAMS = {
  searchQuery: "",
  sortField: "session_count" as const,
  dateRange: "last90Days" as const,
  tier: null,
};

function makeFetchMock(...responses: Array<{ ok: boolean; body: unknown }>) {
  let callIndex = 0;
  return jest.fn().mockImplementation((url: string) => {
    const isPreferences = (url as string).includes("/api/preferences");
    if (isPreferences) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_PREFERENCES),
      });
    }
    const response = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: response.ok,
      json: () => Promise.resolve(response.body),
    });
  });
}

describe("useClients", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("loads initial page and returns client list", async () => {
    global.fetch = makeFetchMock({ ok: true, body: MOCK_CLIENTS_PAGE_1 });

    const { result } = renderHook(() => useClients(DEFAULT_PARAMS), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(2);
    expect(result.current.clients[0].name).toBe("Alice");
    expect(result.current.clients[1].name).toBe("Bob");
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("returns defaultCurrency and reportingTimezone from preferences", async () => {
    global.fetch = makeFetchMock({ ok: true, body: MOCK_CLIENTS_PAGE_1 });

    const { result } = renderHook(() => useClients(DEFAULT_PARAMS), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.defaultCurrency).toBe("USD");
    expect(result.current.reportingTimezone).toBe("America/New_York");
  });

  it("load more appends page 2 data to existing clients", async () => {
    global.fetch = makeFetchMock(
      { ok: true, body: MOCK_CLIENTS_PAGE_1 },
      { ok: true, body: MOCK_CLIENTS_PAGE_2 },
    );

    const { result } = renderHook(() => useClients(DEFAULT_PARAMS), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });

    expect(result.current.clients).toHaveLength(3);
    expect(result.current.clients[2].name).toBe("Charlie");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("resets to page 1 when searchQuery changes", async () => {
    global.fetch = makeFetchMock(
      { ok: true, body: MOCK_CLIENTS_PAGE_1 },
      { ok: true, body: MOCK_CLIENTS_PAGE_2 },
    );

    const { result, rerender } = renderHook(
      (props: { searchQuery: string }) =>
        useClients({ ...DEFAULT_PARAMS, searchQuery: props.searchQuery }),
      {
        initialProps: { searchQuery: "" },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(2);

    rerender({ searchQuery: "charlie" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After param change, fresh fetch returns page 2 data (only 1 item)
    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].name).toBe("Charlie");
  });

  it("resets to page 1 when sortField changes", async () => {
    global.fetch = makeFetchMock(
      { ok: true, body: MOCK_CLIENTS_PAGE_1 },
      { ok: true, body: MOCK_CLIENTS_PAGE_2 },
    );

    const { result, rerender } = renderHook(
      (props: { sortField: ClientSortField }) =>
        useClients({ ...DEFAULT_PARAMS, sortField: props.sortField }),
      {
        initialProps: { sortField: "session_count" as ClientSortField },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(2);

    rerender({ sortField: "total_value" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].name).toBe("Charlie");
  });

  it("resets to page 1 when dateRange changes", async () => {
    global.fetch = makeFetchMock(
      { ok: true, body: MOCK_CLIENTS_PAGE_1 },
      { ok: true, body: MOCK_CLIENTS_PAGE_2 },
    );

    const { result, rerender } = renderHook(
      (props: { dateRange: SessionDateRangePreset }) =>
        useClients({ ...DEFAULT_PARAMS, dateRange: props.dateRange }),
      {
        initialProps: { dateRange: "last90Days" as SessionDateRangePreset },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(2);

    rerender({ dateRange: "allTime" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].name).toBe("Charlie");
  });

  it("surfaces error message when API fails", async () => {
    global.fetch = makeFetchMock({
      ok: false,
      body: { error: "Could not load clients." },
    });

    const { result } = renderHook(() => useClients(DEFAULT_PARAMS), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Could not load clients. Please try again.");
    expect(result.current.clients).toHaveLength(0);
  });

  it("surfaces timezone-specific error message for date range boundary errors", async () => {
    global.fetch = makeFetchMock({
      ok: false,
      body: { error: "Could not compute date range boundaries." },
    });

    const { result } = renderHook(() => useClients(DEFAULT_PARAMS), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      "Could not load clients for the selected reporting timezone. Please check your profile timezone and try again.",
    );
  });

  it("includes tier in the clients query string when set", async () => {
    global.fetch = makeFetchMock({ ok: true, body: MOCK_CLIENTS_PAGE_1 });

    const { result } = renderHook(
      () => useClients({ ...DEFAULT_PARAMS, tier: "vip" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const clientsCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => (url as string).includes("/api/clients"),
    );
    expect(clientsCalls.length).toBeGreaterThan(0);
    expect(clientsCalls[0][0]).toContain("tier=vip");
  });

  it("omits tier from the clients query string when null", async () => {
    global.fetch = makeFetchMock({ ok: true, body: MOCK_CLIENTS_PAGE_1 });

    const { result } = renderHook(
      () => useClients({ ...DEFAULT_PARAMS, tier: null }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const clientsCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => (url as string).includes("/api/clients"),
    );
    expect(clientsCalls.length).toBeGreaterThan(0);
    expect(clientsCalls[0][0]).not.toContain("tier=");
  });

  it("resets to page 1 when tier changes", async () => {
    global.fetch = makeFetchMock(
      { ok: true, body: MOCK_CLIENTS_PAGE_1 },
      { ok: true, body: MOCK_CLIENTS_PAGE_2 },
    );

    const { result, rerender } = renderHook(
      (props: { tier: "vip" | "regular" | "one-timer" | null }) =>
        useClients({ ...DEFAULT_PARAMS, tier: props.tier }),
      {
        initialProps: { tier: null as "vip" | "regular" | "one-timer" | null },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.clients).toHaveLength(2);

    rerender({ tier: "vip" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // After tier change, fresh fetch returns page 2 data (only 1 item)
    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].name).toBe("Charlie");
  });

  it("does not fetch clients until preferences are loaded", async () => {
    let resolvePreferences!: (value: unknown) => void;
    const preferencesPromise = new Promise((resolve) => {
      resolvePreferences = resolve;
    });

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if ((url as string).includes("/api/preferences")) {
        return preferencesPromise.then((body) => ({
          ok: true,
          json: () => Promise.resolve(body),
        }));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(MOCK_CLIENTS_PAGE_1),
      });
    });

    const { result } = renderHook(() => useClients(DEFAULT_PARAMS), {
      wrapper: createWrapper(),
    });

    // Clients endpoint should not have been called yet
    const clientsCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => (url as string).includes("/api/clients"),
    );
    expect(clientsCalls).toHaveLength(0);

    // Now resolve preferences
    act(() => {
      resolvePreferences(MOCK_PREFERENCES);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const clientsCallsAfter = (global.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => (url as string).includes("/api/clients"),
    );
    expect(clientsCallsAfter.length).toBeGreaterThan(0);
    expect(result.current.clients).toHaveLength(2);
  });
});
