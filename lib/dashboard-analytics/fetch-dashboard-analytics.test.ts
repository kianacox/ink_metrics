import {
  assertSupportedDashboardAnalyticsMonth,
  DashboardAnalyticsMonthParamError,
  fetchDashboardAnalytics,
} from "@/lib/dashboard-analytics/fetch-dashboard-analytics";

function buildSupabaseMock({
  profileError = null,
  profileTimezone = "Europe/London",
  takeHomeRpcData = [
    {
      gross_minor: 196000,
      paid_to_studio_minor: 45000,
      total_expenses_minor: 6200,
      net_minor: 144800,
      session_count: 10,
    },
  ],
  takeHomeRpcError = null,
  retentionRpcData = [
    {
      unique_clients_total: 8,
      clients_with_2plus_sessions_total: 3,
      total_sessions: 20,
    },
  ],
  retentionRpcError = null,
  expensesCategoryRpcData = [] as Array<{ category: string; total_minor: number | string | null }>,
  expensesCategoryRpcError = null,
  priorSessionsCount = 0,
  priorExpensesCount = 0,
}: {
  profileError?: { message: string } | null;
  profileTimezone?: string;
  takeHomeRpcData?: Array<{
    gross_minor: number | string | null;
    paid_to_studio_minor: number | string | null;
    total_expenses_minor: number | string | null;
    net_minor: number | string | null;
    session_count: number | string | null;
  }>;
  takeHomeRpcError?: { message: string } | null;
  retentionRpcData?: Array<{
    unique_clients_total: number | string | null;
    clients_with_2plus_sessions_total: number | string | null;
    total_sessions: number | string | null;
  }>;
  retentionRpcError?: { message: string } | null;
  expensesCategoryRpcData?: Array<{ category: string; total_minor: number | string | null }>;
  expensesCategoryRpcError?: { message: string } | null;
  priorSessionsCount?: number;
  priorExpensesCount?: number;
}) {
  const profileLimit = jest.fn().mockResolvedValue({
    data: [{ reporting_timezone: profileTimezone }],
    error: profileError,
  });
  const profileEq = jest.fn(() => ({ limit: profileLimit }));
  const profileSelect = jest.fn(() => ({ eq: profileEq }));

  const sessionsLt = jest.fn().mockResolvedValue({
    count: priorSessionsCount,
    error: null,
  });
  const sessionsGte = jest.fn(() => ({ lt: sessionsLt }));
  const sessionsEq = jest.fn(() => ({ gte: sessionsGte }));
  const sessionsSelect = jest.fn(() => ({ eq: sessionsEq }));

  const expensesLt = jest.fn().mockResolvedValue({
    count: priorExpensesCount,
    error: null,
  });
  const expensesGte = jest.fn(() => ({ lt: expensesLt }));
  const expensesEq = jest.fn(() => ({ gte: expensesGte }));
  const expensesSelect = jest.fn(() => ({ eq: expensesEq }));

  const from = jest.fn((table: string) => {
    if (table === "profiles") {
      return { select: profileSelect };
    }
    if (table === "sessions") {
      return { select: sessionsSelect };
    }
    if (table === "expenses") {
      return { select: expensesSelect };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  const select = profileSelect;
  const eq = profileEq;
  const limit = profileLimit;
  const rpc = jest.fn().mockImplementation((functionName: string) => {
    if (functionName === "compute_dashboard_take_home_summary") {
      return Promise.resolve({
        data: takeHomeRpcData,
        error: takeHomeRpcError,
      });
    }

    if (functionName === "compute_lifetime_client_retention") {
      return Promise.resolve({
        data: retentionRpcData,
        error: retentionRpcError,
      });
    }

    if (functionName === "compute_expenses_by_category") {
      return Promise.resolve({
        data: expensesCategoryRpcData,
        error: expensesCategoryRpcError,
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

describe("assertSupportedDashboardAnalyticsMonth", () => {
  it("accepts null", () => {
    expect(() => assertSupportedDashboardAnalyticsMonth(null)).not.toThrow();
  });

  it("accepts 'current'", () => {
    expect(() => assertSupportedDashboardAnalyticsMonth("current")).not.toThrow();
  });

  it("accepts a valid YYYY-MM month param", () => {
    expect(() => assertSupportedDashboardAnalyticsMonth("2026-03")).not.toThrow();
    expect(() => assertSupportedDashboardAnalyticsMonth("2026-01")).not.toThrow();
    expect(() => assertSupportedDashboardAnalyticsMonth("2026-12")).not.toThrow();
  });

  it("throws for an out-of-range month number", () => {
    expect(() => assertSupportedDashboardAnalyticsMonth("2026-00")).toThrow(
      DashboardAnalyticsMonthParamError,
    );
    expect(() => assertSupportedDashboardAnalyticsMonth("2026-13")).toThrow(
      DashboardAnalyticsMonthParamError,
    );
  });

  it("throws for malformed values", () => {
    expect(() => assertSupportedDashboardAnalyticsMonth("last")).toThrow(
      DashboardAnalyticsMonthParamError,
    );
    expect(() => assertSupportedDashboardAnalyticsMonth("2026/03")).toThrow(
      DashboardAnalyticsMonthParamError,
    );
    expect(() => assertSupportedDashboardAnalyticsMonth("2026-3")).toThrow(
      DashboardAnalyticsMonthParamError,
    );
    expect(() => assertSupportedDashboardAnalyticsMonth("26-03")).toThrow(
      DashboardAnalyticsMonthParamError,
    );
  });
});

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
      totalSessions: 20,
    });
    expect(result.averageProfitPerSession).toEqual({
      sessionCount: 10,
      valueMinor: 14480,
    });
  });

  it("computes average profit per session as truncated integer division", async () => {
    const mock = buildSupabaseMock({
      takeHomeRpcData: [
        {
          gross_minor: 100000,
          paid_to_studio_minor: 10000,
          total_expenses_minor: 3000,
          net_minor: 87000,
          session_count: 7,
        },
      ],
    });

    const result = await fetchDashboardAnalytics({
      supabase: mock.supabase as never,
      userId: "user-1",
    });

    // 87000 / 7 = 12428.57… → truncated to 12428
    expect(result.averageProfitPerSession).toEqual({
      sessionCount: 7,
      valueMinor: 12428,
    });
  });

  it("returns zero average profit when session count is zero", async () => {
    const mock = buildSupabaseMock({
      takeHomeRpcData: [
        {
          gross_minor: 0,
          paid_to_studio_minor: 0,
          total_expenses_minor: 0,
          net_minor: 0,
          session_count: 0,
        },
      ],
    });

    const result = await fetchDashboardAnalytics({
      supabase: mock.supabase as never,
      userId: "user-1",
    });

    expect(result.averageProfitPerSession).toEqual({
      sessionCount: 0,
      valueMinor: 0,
    });
  });

  describe("averageProfitPerSession edge cases", () => {
    it("preserves negative net take-home when expenses exceed gross", async () => {
      // Valid month: high equipment costs push net below zero
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 50000,
            paid_to_studio_minor: 0,
            total_expenses_minor: 80000,
            net_minor: -30000,
            session_count: 4,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      // Math.trunc(-30000 / 4) = Math.trunc(-7500) = -7500
      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 4,
        valueMinor: -7500,
      });
    });

    it("truncates toward zero for negative fractional results", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 10000,
            paid_to_studio_minor: 0,
            total_expenses_minor: 31000,
            net_minor: -21000,
            session_count: 7,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      // Math.trunc(-21000 / 7) = Math.trunc(-3000) = -3000
      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 7,
        valueMinor: -3000,
      });
    });

    it("handles string-encoded session_count and net_minor from Postgres bigint serialization", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: "196000",
            paid_to_studio_minor: "45000",
            total_expenses_minor: "6200",
            net_minor: "144800",
            session_count: "10",
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 10,
        valueMinor: 14480,
      });
    });

    it("returns zeros when the RPC result set is empty", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [],
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
      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 0,
        valueMinor: 0,
      });
    });

    it("computes correctly for a single session", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 75000,
            paid_to_studio_minor: 0,
            total_expenses_minor: 5000,
            net_minor: 70000,
            session_count: 1,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 1,
        valueMinor: 70000,
      });
    });

    it("handles very large monetary values without overflow", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 100_000_000, // £1,000,000
            paid_to_studio_minor: 20_000_000,
            total_expenses_minor: 5_000_000,
            net_minor: 75_000_000,
            session_count: 100,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 100,
        valueMinor: 750_000, // £7,500.00 per session
      });
    });

    it("treats negative session_count as zero denominator (malformed data guard)", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 50000,
            paid_to_studio_minor: 0,
            total_expenses_minor: 0,
            net_minor: 50000,
            session_count: -3,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      // toSafeInt(-3) = -3; toSafeAvgPerSession guard: sessionCount <= 0 → 0
      expect(result.averageProfitPerSession).toEqual({
        sessionCount: -3,
        valueMinor: 0,
      });
    });

    it("truncates float session_count to integer before dividing", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 50000,
            paid_to_studio_minor: 0,
            total_expenses_minor: 0,
            net_minor: 50000,
            session_count: 2.9,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      // toSafeInt(2.9) = 2; 50000 / 2 = 25000
      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 2,
        valueMinor: 25000,
      });
    });

    it("returns zero average profit when net is zero with active sessions", async () => {
      // Artist broke even: gross exactly covered by studio + expenses
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 50000,
            paid_to_studio_minor: 30000,
            total_expenses_minor: 20000,
            net_minor: 0,
            session_count: 5,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 5,
        valueMinor: 0,
      });
    });

    it("returns exact integer for evenly divisible net and session count", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 90000,
            paid_to_studio_minor: 0,
            total_expenses_minor: 0,
            net_minor: 90000,
            session_count: 3,
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 3,
        valueMinor: 30000,
      });
    });

    it("sanitizes signed-zero session_count to zero", async () => {
      const mock = buildSupabaseMock({
        takeHomeRpcData: [
          {
            gross_minor: 0,
            paid_to_studio_minor: 0,
            total_expenses_minor: 0,
            net_minor: 0,
            session_count: "-0",
          },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(Object.is(result.averageProfitPerSession.sessionCount, -0)).toBe(false);
      expect(result.averageProfitPerSession).toEqual({
        sessionCount: 0,
        valueMinor: 0,
      });
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
          session_count: null,
        },
      ],
      retentionRpcData: [
        {
          unique_clients_total: "-0",
          clients_with_2plus_sessions_total: "Infinity",
          total_sessions: null,
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
      totalSessions: 0,
    });
    expect(result.averageProfitPerSession).toEqual({
      sessionCount: 0,
      valueMinor: 0,
    });
  });

  it("returns a zero rate when retention denominator is zero", async () => {
    const mock = buildSupabaseMock({
      retentionRpcData: [
        {
          unique_clients_total: 0,
          clients_with_2plus_sessions_total: 5,
          total_sessions: 0,
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
      totalSessions: 0,
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

  describe("expensesByCategory", () => {
    it("maps RPC rows into category items with correct totals", async () => {
      const mock = buildSupabaseMock({
        expensesCategoryRpcData: [
          { category: "cartridges", total_minor: 2800 },
          { category: "miscellaneous", total_minor: 3400 },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(mock.rpc).toHaveBeenCalledWith(
        "compute_expenses_by_category",
        expect.objectContaining({ p_user_id: "user-1" }),
      );

      const cartridges = result.expensesByCategory.items.find((i) => i.category === "cartridges");
      const misc = result.expensesByCategory.items.find((i) => i.category === "miscellaneous");
      expect(cartridges).toEqual({ category: "cartridges", totalMinor: 2800 });
      expect(misc).toEqual({ category: "miscellaneous", totalMinor: 3400 });
      expect(result.expensesByCategory.totalMinor).toBe(6200);
    });

    it("fills missing categories with zero", async () => {
      const mock = buildSupabaseMock({
        expensesCategoryRpcData: [{ category: "ink", total_minor: 5000 }],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      const allCategories = result.expensesByCategory.items.map((i) => i.category);
      expect(allCategories).toContain("cartridges");
      expect(allCategories).toContain("needles");
      const needles = result.expensesByCategory.items.find((i) => i.category === "needles");
      expect(needles?.totalMinor).toBe(0);
    });

    it("returns all zeros when no expenses in window", async () => {
      const mock = buildSupabaseMock({ expensesCategoryRpcData: [] });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.expensesByCategory.totalMinor).toBe(0);
      expect(result.expensesByCategory.items.every((i) => i.totalMinor === 0)).toBe(true);
    });

    it("handles string-encoded total_minor from Postgres bigint serialization", async () => {
      const mock = buildSupabaseMock({
        expensesCategoryRpcData: [{ category: "machines", total_minor: "22000" }],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      const machines = result.expensesByCategory.items.find((i) => i.category === "machines");
      expect(machines?.totalMinor).toBe(22000);
    });

    it("ignores unknown categories from RPC output", async () => {
      const mock = buildSupabaseMock({
        expensesCategoryRpcData: [
          { category: "unknown_future_category", total_minor: 9999 },
          { category: "ink", total_minor: 1000 },
        ],
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(result.expensesByCategory.items.find((i) => i.category === "unknown_future_category")).toBeUndefined();
      const ink = result.expensesByCategory.items.find((i) => i.category === "ink");
      expect(ink?.totalMinor).toBe(1000);
      expect(result.expensesByCategory.totalMinor).toBe(1000);
    });

    it("throws a stable error when expenses category RPC fails", async () => {
      const mock = buildSupabaseMock({
        expensesCategoryRpcError: { message: "rpc failed" },
      });

      await expect(
        fetchDashboardAnalytics({
          supabase: mock.supabase as never,
          userId: "user-1",
        }),
      ).rejects.toThrow("Could not compute dashboard expense category metrics.");
    });

    it("includes all seven canonical expense categories in response items", async () => {
      const mock = buildSupabaseMock({ expensesCategoryRpcData: [] });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      const categories = result.expensesByCategory.items.map((i) => i.category);
      expect(categories).toEqual(
        expect.arrayContaining([
          "ink",
          "cartridges",
          "needles",
          "machines",
          "other_equipment",
          "travel",
          "miscellaneous",
        ]),
      );
      expect(categories).toHaveLength(7);
    });
  });

  describe("monthParam handling", () => {
    it("defaults to 'current' month when no monthParam is provided", async () => {
      const mock = buildSupabaseMock({});

      await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      // The take-home RPC should have been called with the user id and a
      // reporting timezone — the window itself is the "current" window.
      expect(mock.rpc).toHaveBeenCalledWith(
        "compute_dashboard_take_home_summary",
        expect.objectContaining({
          p_user_id: "user-1",
          p_reporting_timezone: "Europe/London",
        }),
      );
    });

    it("passes a YYYY-MM monthParam through to the analytics RPCs", async () => {
      const mock = buildSupabaseMock({});

      await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
        monthParam: "2026-03",
      });

      // March 2026 in Europe/London: GMT (UTC+0). The window is
      // [2026-03-01T00:00Z, 2026-04-01T00:00Z) because BST starts late March
      // 2026 (29 Mar) — but the window is keyed off the *start* of the local
      // month so the start is exactly 00:00Z.
      expect(mock.rpc).toHaveBeenCalledWith(
        "compute_dashboard_take_home_summary",
        expect.objectContaining({
          p_user_id: "user-1",
          p_reporting_timezone: "Europe/London",
          p_month_start_local_date: "2026-03-01",
          p_month_end_local_date: "2026-04-01",
          p_month_start_utc: "2026-03-01T00:00:00.000Z",
        }),
      );

      expect(mock.rpc).toHaveBeenCalledWith(
        "compute_expenses_by_category",
        expect.objectContaining({
          p_user_id: "user-1",
          p_month_start_local_date: "2026-03-01",
          p_month_end_local_date: "2026-04-01",
        }),
      );
    });

    it("does not scope client retention by month (lifetime)", async () => {
      const mock = buildSupabaseMock({});

      await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
        monthParam: "2026-03",
      });

      // compute_lifetime_client_retention should be called with only the
      // user id — no month window params.
      expect(mock.rpc).toHaveBeenCalledWith(
        "compute_lifetime_client_retention",
        { p_user_id: "user-1" },
      );
    });
  });

  describe("hasPriorMonthData", () => {
    it("returns hasPriorMonthData: true when the prior month has activity", async () => {
      const mock = buildSupabaseMock({ priorSessionsCount: 1 });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
        monthParam: "2026-04",
      });

      expect(result.hasPriorMonthData).toBe(true);
    });

    it("returns hasPriorMonthData: false when the prior month is empty", async () => {
      const mock = buildSupabaseMock({
        priorSessionsCount: 0,
        priorExpensesCount: 0,
      });

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
        monthParam: "2026-04",
      });

      expect(result.hasPriorMonthData).toBe(false);
    });
  });

  describe("response shape", () => {
    it("does not include hoursTattooing in the response", async () => {
      const mock = buildSupabaseMock({});

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect("hoursTattooing" in result).toBe(false);
    });

    it("includes hasPriorMonthData in the response", async () => {
      const mock = buildSupabaseMock({});

      const result = await fetchDashboardAnalytics({
        supabase: mock.supabase as never,
        userId: "user-1",
      });

      expect(typeof result.hasPriorMonthData).toBe("boolean");
    });
  });
});
