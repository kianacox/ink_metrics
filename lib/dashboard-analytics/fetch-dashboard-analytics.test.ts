import { fetchDashboardAnalytics } from "@/lib/dashboard-analytics/fetch-dashboard-analytics";

function buildSupabaseMock({
  profileError = null,
  profileTimezone = "Europe/London",
  takeHomeRpcData = [
    {
      gross_minor: 196000,
      paid_to_studio_minor: 45000,
      total_expenses_minor: 6200,
      net_minor: 144800,
    },
  ],
  takeHomeRpcError = null,
  retentionRpcData = [
    {
      unique_clients_in_month: 8,
      clients_with_2plus_sessions_in_month: 3,
    },
  ],
  retentionRpcError = null,
}: {
  profileError?: { message: string } | null;
  profileTimezone?: string;
  takeHomeRpcData?: Array<{
    gross_minor: number | string | null;
    paid_to_studio_minor: number | string | null;
    total_expenses_minor: number | string | null;
    net_minor: number | string | null;
  }>;
  takeHomeRpcError?: { message: string } | null;
  retentionRpcData?: Array<{
    unique_clients_in_month: number | string | null;
    clients_with_2plus_sessions_in_month: number | string | null;
  }>;
  retentionRpcError?: { message: string } | null;
}) {
  const limit = jest.fn().mockResolvedValue({
    data: [{ reporting_timezone: profileTimezone }],
    error: profileError,
  });
  const eq = jest.fn(() => ({ limit }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  const rpc = jest.fn().mockImplementation((functionName: string) => {
    if (functionName === "compute_dashboard_take_home_summary") {
      return Promise.resolve({
        data: takeHomeRpcData,
        error: takeHomeRpcError,
      });
    }

    if (functionName === "compute_dashboard_client_retention") {
      return Promise.resolve({
        data: retentionRpcData,
        error: retentionRpcError,
      });
    }

    return Promise.resolve({
      data: null,
      error: { message: `Unexpected rpc ${functionName}` },
    });
  });

  return {
    supabase: { from, rpc },
    from,
    select,
    eq,
    limit,
    rpc,
  };
}

describe("fetchDashboardAnalytics", () => {
  it("maps take-home RPC output into the analytics response", async () => {
    const mock = buildSupabaseMock({});

    const result = await fetchDashboardAnalytics({
      supabase: mock.supabase as never,
      userId: "user-1",
    });

    expect(mock.from).toHaveBeenCalledWith("profiles");
    expect(mock.rpc).toHaveBeenCalledWith(
      "compute_dashboard_take_home_summary",
      expect.objectContaining({
        p_user_id: "user-1",
        p_reporting_timezone: "Europe/London",
      }),
    );
    expect(result.takeHome).toEqual({
      grossMinor: 196000,
      paidToStudioMinor: 45000,
      totalExpensesMinor: 6200,
      netMinor: 144800,
    });
    expect(result.retention).toEqual({
      numerator: 3,
      denominator: 8,
      rate: 0.375,
    });
  });

  it("sanitizes non-finite and signed-zero values from RPC output", async () => {
    const mock = buildSupabaseMock({
      takeHomeRpcData: [
        {
          gross_minor: "NaN",
          paid_to_studio_minor: "Infinity",
          total_expenses_minor: "-0",
          net_minor: null,
        },
      ],
      retentionRpcData: [
        {
          unique_clients_in_month: "-0",
          clients_with_2plus_sessions_in_month: "Infinity",
        },
      ],
    });

    const result = await fetchDashboardAnalytics({
      supabase: mock.supabase as never,
      userId: "user-1",
    });

    expect(result.takeHome).toEqual({
      grossMinor: 0,
      paidToStudioMinor: 0,
      totalExpensesMinor: 0,
      netMinor: 0,
    });
    expect(result.retention).toEqual({
      numerator: 0,
      denominator: 0,
      rate: 0,
    });
  });

  it("returns a zero rate when retention denominator is zero", async () => {
    const mock = buildSupabaseMock({
      retentionRpcData: [
        {
          unique_clients_in_month: 0,
          clients_with_2plus_sessions_in_month: 5,
        },
      ],
    });

    const result = await fetchDashboardAnalytics({
      supabase: mock.supabase as never,
      userId: "user-1",
    });

    expect(result.retention).toEqual({
      numerator: 5,
      denominator: 0,
      rate: 0,
    });
  });

  it("throws a stable error when the profile timezone cannot be loaded", async () => {
    const mock = buildSupabaseMock({
      profileError: { message: "boom" },
    });

    await expect(
      fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      }),
    ).rejects.toThrow("Could not load dashboard analytics profile settings.");
  });

  it("throws a stable error when take-home RPC fails", async () => {
    const mock = buildSupabaseMock({
      takeHomeRpcError: { message: "rpc failed" },
    });

    await expect(
      fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      }),
    ).rejects.toThrow("Could not compute dashboard take-home metrics.");
  });

  it("throws a stable error when retention RPC fails", async () => {
    const mock = buildSupabaseMock({
      retentionRpcError: { message: "rpc failed" },
    });

    await expect(
      fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      }),
    ).rejects.toThrow("Could not compute dashboard retention metrics.");
  });
});
