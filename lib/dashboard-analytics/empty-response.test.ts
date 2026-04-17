import { buildEmptyAnalyticsResponse } from "@/lib/dashboard-analytics/empty-response";
import { EXPENSE_CATEGORIES } from "@/lib/expenses/models";

describe("buildEmptyAnalyticsResponse", () => {
  it("returns the stable analytics response shape with zero values", () => {
    const result = buildEmptyAnalyticsResponse({
      startUtcIso: "2026-04-01T00:00:00.000Z",
      endUtcIso: "2026-05-01T00:00:00.000Z",
      timezone: "UTC",
      monthLabel: "April",
      monthStartLocalDate: "2026-04-01",
      monthEndLocalDate: "2026-05-01",
    });

    expect(result.monthLabel).toBe("April");
    expect(result.timeWindow).toEqual({
      startUtcIso: "2026-04-01T00:00:00.000Z",
      endUtcIso: "2026-05-01T00:00:00.000Z",
      timezone: "UTC",
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
    expect(result.averageProfitPerSession).toEqual({
      valueMinor: 0,
      sessionCount: 0,
    });
    expect(result.hoursTattooing).toEqual({
      totalMinutes: 0,
      totalHours: 0,
    });
    expect(result.expensesByCategory.totalMinor).toBe(0);
    expect(result.expensesByCategory.items).toHaveLength(EXPENSE_CATEGORIES.length);
    expect(result.expensesByCategory.items.map((item) => item.category)).toEqual(EXPENSE_CATEGORIES);
    expect(result.expensesByCategory.items.every((item) => item.totalMinor === 0)).toBe(true);
  });
});
