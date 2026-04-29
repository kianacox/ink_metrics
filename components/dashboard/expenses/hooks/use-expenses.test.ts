import { renderHook, waitFor, act } from "@testing-library/react";
import { useExpenses } from "./use-expenses";
import { createWrapper } from "@/lib/test-utils/query-wrapper";

const MOCK_PREFERENCES = {
  defaultCurrency: "GBP",
  reportingTimezone: "Europe/London",
};

const MOCK_PAGE_1 = {
  data: [
    { id: "exp-1", item: "Black ink", category: "ink", amountMinor: 1500, currencyCode: "GBP", datePurchased: "2026-01-10", receiptPath: null, receiptMimeType: null, receiptSizeBytes: null, createdAt: "2026-01-10T10:00:00Z" },
    { id: "exp-2", item: "Needles pack", category: "needles", amountMinor: 800, currencyCode: "GBP", datePurchased: "2026-01-09", receiptPath: null, receiptMimeType: null, receiptSizeBytes: null, createdAt: "2026-01-09T10:00:00Z" },
  ],
  nextCursor: "cursor-abc",
  hasNextPage: true,
  rangeTotalMinor: 5000,
};

const MOCK_PAGE_2 = {
  data: [
    { id: "exp-3", item: "Travel", category: "travel", amountMinor: 2700, currencyCode: "GBP", datePurchased: "2026-01-08", receiptPath: null, receiptMimeType: null, receiptSizeBytes: null, createdAt: "2026-01-08T10:00:00Z" },
  ],
  nextCursor: null,
  hasNextPage: false,
  rangeTotalMinor: 5000,
};

describe("useExpenses", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("fetches preferences then expenses on mount", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PAGE_1) }) as jest.Mock;

    const { result } = renderHook(
      () => useExpenses({ selectedCategories: [], dateRange: "last90Days" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.expenses).toHaveLength(2);
    expect(result.current.expenses[0].id).toBe("exp-1");
    expect(result.current.defaultCurrency).toBe("GBP");
    expect(result.current.rangeTotalMinor).toBe(5000);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch expenses until preferences resolve", async () => {
    let resolvePrefs!: (value: unknown) => void;
    const prefsPromise = new Promise((res) => { resolvePrefs = res; });

    global.fetch = jest
      .fn()
      .mockReturnValueOnce({ ok: true, json: () => prefsPromise })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(MOCK_PAGE_1) }) as jest.Mock;

    const { result } = renderHook(
      () => useExpenses({ selectedCategories: [], dateRange: "last90Days" }),
      { wrapper: createWrapper() },
    );

    expect(result.current.expenses).toHaveLength(0);

    await act(async () => {
      resolvePrefs(MOCK_PREFERENCES);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.expenses).toHaveLength(2);
  });

  it("appends expenses when loading more", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PAGE_1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PAGE_2) }) as jest.Mock;

    const { result } = renderHook(
      () => useExpenses({ selectedCategories: [], dateRange: "last90Days" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.expenses).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });

    expect(result.current.expenses).toHaveLength(3);
    expect(result.current.expenses[2].id).toBe("exp-3");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces an error when the expenses API fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      }) as jest.Mock;

    const { result } = renderHook(
      () => useExpenses({ selectedCategories: [], dateRange: "last90Days" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Unauthorized");
    expect(result.current.expenses).toHaveLength(0);
  });

  it("resets to page 1 when filter changes", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_PREFERENCES) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ ...MOCK_PAGE_1, hasNextPage: false, nextCursor: null }) }) as jest.Mock;

    const { result, rerender } = renderHook(
      ({ cats }: { cats: string[] }) =>
        useExpenses({ selectedCategories: cats, dateRange: "last90Days" }),
      { wrapper: createWrapper(), initialProps: { cats: [] as string[] } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callCountAfterFirst = (global.fetch as jest.Mock).mock.calls.length;

    rerender({ cats: ["ink"] });

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callCountAfterFirst);
    });

    const expensesCall = (global.fetch as jest.Mock).mock.calls
      .slice(callCountAfterFirst)
      .find((call: unknown[]) => (call[0] as string).includes("/api/expenses"));
    expect(expensesCall?.[0]).toContain("category=ink");
    expect(expensesCall?.[0]).not.toContain("cursor=");
  });
});
