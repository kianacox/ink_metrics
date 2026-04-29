import {
  computeCurrentMonthWindow,
  hasPriorMonthData,
  parseMonthParam,
} from "@/lib/dashboard-analytics/month-window";

describe("computeCurrentMonthWindow", () => {
  it("builds a UTC half-open month window", () => {
    const result = computeCurrentMonthWindow({
      timezone: "UTC",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(result).toEqual({
      startUtcIso: "2026-04-01T00:00:00.000Z",
      endUtcIso: "2026-05-01T00:00:00.000Z",
      timezone: "UTC",
      monthLabel: "April",
      monthStartLocalDate: "2026-04-01",
      monthEndLocalDate: "2026-05-01",
    });
  });

  it("respects timezone offsets at month boundaries", () => {
    const london = computeCurrentMonthWindow({
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });
    const losAngeles = computeCurrentMonthWindow({
      timezone: "America/Los_Angeles",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });
    const auckland = computeCurrentMonthWindow({
      timezone: "Pacific/Auckland",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(london.startUtcIso).toBe("2026-03-31T23:00:00.000Z");
    expect(london.endUtcIso).toBe("2026-04-30T23:00:00.000Z");
    expect(losAngeles.startUtcIso).toBe("2026-04-01T07:00:00.000Z");
    expect(losAngeles.endUtcIso).toBe("2026-05-01T07:00:00.000Z");

    expect(auckland.timezone).toBe("Pacific/Auckland");
    expect(auckland.monthLabel).toBe("April");
    expect(auckland.monthStartLocalDate).toBe("2026-04-01");
    expect(auckland.monthEndLocalDate).toBe("2026-05-01");
  });
});

describe("parseMonthParam", () => {
  it("returns the correct UTC window for a YYYY-MM value in Europe/London", () => {
    const result = parseMonthParam(
      "2026-03",
      "Europe/London",
      new Date("2026-04-10T12:00:00.000Z"),
    );

    // March 2026 in London: starts in GMT (UTC+0), ends after BST kicks in (UTC+1)
    expect(result).toEqual({
      startUtcIso: "2026-03-01T00:00:00.000Z",
      endUtcIso: "2026-03-31T23:00:00.000Z",
      timezone: "Europe/London",
      monthLabel: "March",
      monthStartLocalDate: "2026-03-01",
      monthEndLocalDate: "2026-04-01",
    });
  });

  it("returns the correct UTC window for a YYYY-MM value in America/Los_Angeles", () => {
    const result = parseMonthParam(
      "2026-01",
      "America/Los_Angeles",
      new Date("2026-04-10T12:00:00.000Z"),
    );

    expect(result.startUtcIso).toBe("2026-01-01T08:00:00.000Z");
    expect(result.endUtcIso).toBe("2026-02-01T08:00:00.000Z");
    expect(result.timezone).toBe("America/Los_Angeles");
    expect(result.monthLabel).toBe("January");
    expect(result.monthStartLocalDate).toBe("2026-01-01");
    expect(result.monthEndLocalDate).toBe("2026-02-01");
  });

  it("delegates to computeCurrentMonthWindow when monthParam is 'current'", () => {
    const now = new Date("2026-04-10T12:00:00.000Z");
    const parsed = parseMonthParam("current", "Europe/London", now);
    const direct = computeCurrentMonthWindow({ timezone: "Europe/London", now });

    expect(parsed).toEqual(direct);
  });

  it("falls back to the default reporting timezone for unknown timezones", () => {
    const result = parseMonthParam(
      "2026-03",
      "Not/AZone",
      new Date("2026-04-10T12:00:00.000Z"),
    );

    expect(result.timezone).toBe("Europe/London");
    expect(result.startUtcIso).toBe("2026-03-01T00:00:00.000Z");
  });

  it("throws for an invalid month param", () => {
    expect(() =>
      parseMonthParam("invalid", "Europe/London", new Date("2026-04-10T12:00:00.000Z")),
    ).toThrow("Invalid month param: invalid");
  });

  it("throws for a malformed YYYY-MM month param", () => {
    expect(() =>
      parseMonthParam("2026-13", "Europe/London", new Date("2026-04-10T12:00:00.000Z")),
    ).toThrow(/Invalid month param: 2026-13/);
  });
});

describe("hasPriorMonthData", () => {
  function buildSupabaseMock({
    sessionCount = 0,
    expenseCount = 0,
    sessionError = null,
    expenseError = null,
  }: {
    sessionCount?: number | null;
    expenseCount?: number | null;
    sessionError?: { message: string } | null;
    expenseError?: { message: string } | null;
  }) {
    const sessionsLt = jest.fn().mockResolvedValue({
      count: sessionCount,
      error: sessionError,
    });
    const sessionsGte = jest.fn(() => ({ lt: sessionsLt }));
    const sessionsEq = jest.fn(() => ({ gte: sessionsGte }));
    const sessionsSelect = jest.fn(() => ({ eq: sessionsEq }));

    const expensesLt = jest.fn().mockResolvedValue({
      count: expenseCount,
      error: expenseError,
    });
    const expensesGte = jest.fn(() => ({ lt: expensesLt }));
    const expensesEq = jest.fn(() => ({ gte: expensesGte }));
    const expensesSelect = jest.fn(() => ({ eq: expensesEq }));

    const from = jest.fn((table: string) => {
      if (table === "sessions") {
        return { select: sessionsSelect };
      }
      if (table === "expenses") {
        return { select: expensesSelect };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    return {
      supabase: { from },
      from,
      sessionsSelect,
      sessionsEq,
      sessionsGte,
      sessionsLt,
      expensesSelect,
      expensesEq,
      expensesGte,
      expensesLt,
    };
  }

  it("returns true when the prior month has at least one session", async () => {
    const mock = buildSupabaseMock({ sessionCount: 1, expenseCount: 0 });

    const result = await hasPriorMonthData({
      supabase: mock.supabase as never,
      userId: "user-1",
      monthParam: "current",
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(result).toBe(true);
    expect(mock.from).toHaveBeenCalledWith("sessions");
    expect(mock.from).toHaveBeenCalledWith("expenses");
    expect(mock.sessionsEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mock.expensesEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns true when the prior month has only an expense", async () => {
    const mock = buildSupabaseMock({ sessionCount: 0, expenseCount: 2 });

    const result = await hasPriorMonthData({
      supabase: mock.supabase as never,
      userId: "user-1",
      monthParam: "current",
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(result).toBe(true);
  });

  it("returns false when the prior month has neither sessions nor expenses", async () => {
    const mock = buildSupabaseMock({ sessionCount: 0, expenseCount: 0 });

    const result = await hasPriorMonthData({
      supabase: mock.supabase as never,
      userId: "user-1",
      monthParam: "current",
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(result).toBe(false);
  });

  it("treats null counts as zero (no data)", async () => {
    const mock = buildSupabaseMock({ sessionCount: null, expenseCount: null });

    const result = await hasPriorMonthData({
      supabase: mock.supabase as never,
      userId: "user-1",
      monthParam: "current",
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(result).toBe(false);
  });

  it("queries the correct prior-month window for an explicit YYYY-MM month param", async () => {
    const mock = buildSupabaseMock({ sessionCount: 0, expenseCount: 0 });

    await hasPriorMonthData({
      supabase: mock.supabase as never,
      userId: "user-1",
      monthParam: "2026-04",
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    // Current window for 2026-04 in London starts at 2026-03-31T23:00:00Z.
    // Prior month window: [2026-02-28T23:00:00Z, 2026-03-31T23:00:00Z).
    expect(mock.sessionsGte).toHaveBeenCalledWith(
      "session_at",
      "2026-02-28T23:00:00.000Z",
    );
    expect(mock.sessionsLt).toHaveBeenCalledWith(
      "session_at",
      "2026-03-31T23:00:00.000Z",
    );
    // Expenses use date_purchased (date column) so values are ISO dates.
    expect(mock.expensesGte).toHaveBeenCalledWith("date_purchased", "2026-02-28");
    expect(mock.expensesLt).toHaveBeenCalledWith("date_purchased", "2026-03-31");
  });
});
