/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { GET } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { fetchDashboardAnalytics } from "@/lib/dashboard-analytics";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

jest.mock("@/lib/dashboard-analytics", () => ({
  ...jest.requireActual("@/lib/dashboard-analytics"),
  fetchDashboardAnalytics: jest.fn(),
}));

const mockedRequireAuthenticatedApiUser = jest.mocked(requireAuthenticatedApiUser);
const mockedFetchDashboardAnalytics = jest.mocked(fetchDashboardAnalytics);

describe("GET /api/dashboard/analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the auth error response when user is unauthenticated", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json({ error: "You must be signed in to view analytics." }, { status: 401 }),
    });

    const response = await GET(new Request("http://localhost/api/dashboard/analytics?month=current"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("You must be signed in to view analytics.");
  });

  it("returns 400 with a stable code for unsupported month params", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await GET(new Request("http://localhost/api/dashboard/analytics?month=last"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH");
    expect(mockedFetchDashboardAnalytics).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed YYYY-MM month params", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await GET(
      new Request("http://localhost/api/dashboard/analytics?month=2026-13"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH");
    expect(mockedFetchDashboardAnalytics).not.toHaveBeenCalled();
  });

  it("accepts a valid YYYY-MM month param and passes it to fetchDashboardAnalytics", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: { rpc: jest.fn() } as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchDashboardAnalytics.mockResolvedValue({
      monthLabel: "March",
      timeWindow: {
        startUtcIso: "2026-03-01T00:00:00.000Z",
        endUtcIso: "2026-04-01T00:00:00.000Z",
        timezone: "Europe/London",
      },
      takeHome: {
        grossMinor: 0,
        paidToStudioMinor: 0,
        totalExpensesMinor: 0,
        netMinor: 0,
      },
      retention: {
        numerator: 0,
        denominator: 0,
        rate: 0,
        totalSessions: 0,
      },
      averageProfitPerSession: {
        valueMinor: 0,
        sessionCount: 0,
      },
      expensesByCategory: {
        items: [],
        totalMinor: 0,
      },
      hasPriorMonthData: false,
    });

    const response = await GET(
      new Request("http://localhost/api/dashboard/analytics?month=2026-03"),
    );

    expect(response.status).toBe(200);
    expect(mockedFetchDashboardAnalytics).toHaveBeenCalledWith({
      supabase: { rpc: expect.any(Function) },
      userId: "user-1",
      monthParam: "2026-03",
    });
  });

  it("returns analytics payload for authenticated requests", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: { rpc: jest.fn() } as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchDashboardAnalytics.mockResolvedValue({
      monthLabel: "April",
      timeWindow: {
        startUtcIso: "2026-03-31T23:00:00.000Z",
        endUtcIso: "2026-04-30T23:00:00.000Z",
        timezone: "Europe/London",
      },
      takeHome: {
        grossMinor: 196000,
        paidToStudioMinor: 45000,
        totalExpensesMinor: 6200,
        netMinor: 144800,
      },
      retention: {
        numerator: 3,
        denominator: 8,
        rate: 0.375,
        totalSessions: 20,
      },
      averageProfitPerSession: {
        valueMinor: 0,
        sessionCount: 0,
      },
      expensesByCategory: {
        items: [],
        totalMinor: 0,
      },
      hasPriorMonthData: true,
    });

    const response = await GET(new Request("http://localhost/api/dashboard/analytics?month=current"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedFetchDashboardAnalytics).toHaveBeenCalledWith({
      supabase: { rpc: expect.any(Function) },
      userId: "user-1",
      monthParam: "current",
    });
    expect(payload.takeHome).toEqual({
      grossMinor: 196000,
      paidToStudioMinor: 45000,
      totalExpensesMinor: 6200,
      netMinor: 144800,
    });
    expect(payload.retention).toEqual({
      numerator: 3,
      denominator: 8,
      rate: 0.375,
      totalSessions: 20,
    });
    expect(payload.averageProfitPerSession).toEqual({
      valueMinor: 0,
      sessionCount: 0,
    });
  });

  it("returns a stable 500 error when analytics loading fails", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchDashboardAnalytics.mockRejectedValue(new Error("db down"));

    const response = await GET(new Request("http://localhost/api/dashboard/analytics?month=current"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      code: "DASHBOARD_ANALYTICS_FAILED",
      error: "Could not load dashboard analytics.",
    });
  });
});
