import { renderHook, waitFor, act } from "@testing-library/react";
import { useInfiniteApiQuery } from "./use-infinite-api-query";
import { createWrapper } from "@/lib/test-utils/query-wrapper";

interface DemoItem {
  id: string;
  name: string;
}

interface DemoParams {
  search: string;
  pageSize: number;
}

function buildSearchParams(params: DemoParams, cursor?: string): URLSearchParams {
  const search = new URLSearchParams({
    search: params.search,
    limit: String(params.pageSize),
  });
  if (cursor) {
    search.set("cursor", cursor);
  }
  return search;
}

const PAGE_1 = {
  data: [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ],
  nextCursor: "cursor-abc",
  hasNextPage: true,
};

const PAGE_2 = {
  data: [{ id: "3", name: "Charlie" }],
  nextCursor: null,
  hasNextPage: false,
};

describe("useInfiniteApiQuery", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("fetches the first page on mount", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(PAGE_1) }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual(PAGE_1.data);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(calledUrl).toContain("/api/demo?");
    expect(calledUrl).toContain("limit=25");
    expect(calledUrl).not.toContain("cursor=");
  });

  it("appends items when fetching the next page via loadMore", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(PAGE_1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(PAGE_2) }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[2]).toEqual({ id: "3", name: "Charlie" });
    expect(result.current.hasNextPage).toBe(false);

    // Second call should include the cursor from page 1.
    const secondCallUrl = (global.fetch as jest.Mock).mock.calls[1][0];
    expect(secondCallUrl).toContain("cursor=cursor-abc");
  });

  it("does not fetch a next page when hasNextPage is false", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ id: "1", name: "Alice" }],
          nextCursor: null,
          hasNextPage: false,
        }),
    }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.loadMore();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error message from the response body when the request fails", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Boom" }),
    }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Boom");
    expect(result.current.items).toHaveLength(0);
  });

  it("falls back to the configured default error message when the body has none", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
          defaultErrorMessage: "Could not load demo.",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Could not load demo.");
  });

  it("applies mapError to translate raw error messages into user-facing strings", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Could not compute date range boundaries." }),
    }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
          mapError: (message) =>
            message === "Could not compute date range boundaries."
              ? "Bad timezone."
              : "Generic.",
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Bad timezone.");
  });

  it("does not fire a request when enabled is false", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(PAGE_1),
    }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it("exposes raw pages so callers can read per-page metadata", async () => {
    const pageWithMeta = {
      data: [{ id: "1", name: "Alice" }],
      nextCursor: null,
      hasNextPage: false,
      rangeTotalMinor: 12345,
    };
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(pageWithMeta),
    }) as jest.Mock;

    const { result } = renderHook(
      () =>
        useInfiniteApiQuery<DemoItem, DemoParams, typeof pageWithMeta>({
          queryKey: ["demo"],
          endpoint: "/api/demo",
          params: { search: "", pageSize: 25 },
          buildSearchParams,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pages).toHaveLength(1);
    expect(result.current.pages[0].rangeTotalMinor).toBe(12345);
  });
});
