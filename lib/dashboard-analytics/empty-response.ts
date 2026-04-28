import { EXPENSE_CATEGORIES } from "@/lib/expenses/models";
import type { DashboardAnalyticsResponse } from "@/lib/dashboard-analytics/models";
import type { DashboardMonthWindow } from "@/lib/dashboard-analytics/month-window";

export function buildEmptyAnalyticsResponse(
  window: DashboardMonthWindow,
): DashboardAnalyticsResponse {
  return {
    monthLabel: window.monthLabel,
    timeWindow: {
      startUtcIso: window.startUtcIso,
      endUtcIso: window.endUtcIso,
      timezone: window.timezone,
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
    hoursTattooing: {
      totalMinutes: 0,
      totalHours: 0,
    },
    expensesByCategory: {
      items: EXPENSE_CATEGORIES.map((category) => ({
        category,
        totalMinor: 0,
      })),
      totalMinor: 0,
    },
  };
}
