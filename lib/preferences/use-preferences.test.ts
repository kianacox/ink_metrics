import { renderHook, waitFor } from "@testing-library/react";
import { usePreferences } from "./use-preferences";
import { createWrapper } from "@/lib/test-utils/query-wrapper";

const MOCK_PREFERENCES = {
  defaultCurrency: "USD",
  reportingTimezone: "America/New_York",
};

describe("usePreferences", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("fetches and returns preferences on mount", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PREFERENCES),
    }) as jest.Mock;

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.defaultCurrency).toBe("USD");
    expect(result.current.data?.reportingTimezone).toBe("America/New_York");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/preferences");
  });

  it("does not trigger a second fetch when called from multiple consumers in the same tree", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_PREFERENCES),
    }) as jest.Mock;

    const wrapper = createWrapper();

    const { result: result1 } = renderHook(() => usePreferences(), { wrapper });
    const { result: result2 } = renderHook(() => usePreferences(), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error when the preferences API fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    }) as jest.Mock;

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });

  it("falls back to defaults when API response is missing fields", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as jest.Mock;

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.defaultCurrency).toBe("GBP");
    expect(result.current.data?.reportingTimezone).toBeTruthy();
  });
});
