import { renderHook, waitFor } from "@testing-library/react";
import { useAnalytics } from "./use-analytics";
import { createWrapper } from "@/lib/test-utils/query-wrapper";
import type { PreferencesData } from "@/lib/preferences/use-preferences";
import type { DashboardAnalyticsResponse } from "@/lib/dashboard-analytics";

const MOCK_PREFERENCES: PreferencesData = {
  defaultCurrency: "USD",
  reportingTimezone: "America/New_York",
};

const MOCK_ANALYTICS: DashboardAnalyticsResponse = {
  monthLabel: "April 2026",
  timeWindow: {
    startUtcIso: "2026-04-01T04:00:00.000Z",
    endUtcIso: "2026-05-01T04:00:00.000Z",
    timezone: "America/New_York",
  },
  takeHome: {
    grossMinor: 500000,
    paidToStudioMinor: 150000,
    totalExpensesMinor: 50000,
    netMinor: 300000,
  },
  retention: {
    numerator: 4,
    denominator: 10,
    rate: 0.4,
    totalSessions: 20,
  },
  averageProfitPerSession: {
    valueMinor: 75000,
    sessionCount: 4,
  },
  hoursTattooing: {
    totalMinutes: 480,
    totalHours: 8,
  },
  expensesByCategory: {
    items: [{ category: "supplies", totalMinor: 50000 }],
    totalMinor: 50000,
  },
};

describe("useAnalytics", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("does not fire before preferences are loaded", () => {
    global.fetch = jest.fn() as jest.Mock;

    const { result } = renderHook(() => useAnalytics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.status).toBe("pending");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fires the query once preferences are loaded", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ANALYTICS),
    }) as jest.Mock;

    const { result } = renderHook(() => useAnalytics(MOCK_PREFERENCES), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/dashboard/analytics?month=current",
      { method: "GET" },
    );
  });

  it("returns the correct analytics shape on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_ANALYTICS),
    }) as jest.Mock;

    const { result } = renderHook(() => useAnalytics(MOCK_PREFERENCES), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.monthLabel).toBe("April 2026");
    expect(result.current.data?.takeHome.grossMinor).toBe(500000);
    expect(result.current.data?.takeHome.netMinor).toBe(300000);
    expect(result.current.data?.retention.rate).toBe(0.4);
    expect(result.current.data?.averageProfitPerSession.valueMinor).toBe(75000);
  });

  it("surfaces an error when the analytics API fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Internal Server Error" }),
    }) as jest.Mock;

    const { result } = renderHook(() => useAnalytics(MOCK_PREFERENCES), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toBe(
      "Could not load dashboard analytics.",
    );
  });
});
