export interface DashboardAnalyticsTimeWindow {
  startUtcIso: string;
  endUtcIso: string;
  timezone: string;
}

export interface TakeHomeSummary {
  grossMinor: number;
  paidToStudioMinor: number;
  totalExpensesMinor: number;
  netMinor: number;
}

export interface RetentionStat {
  numerator: number;
  denominator: number;
  rate: number;
  totalSessions: number;
}

export interface AverageProfitPerSessionStat {
  valueMinor: number;
  sessionCount: number;
}

export interface HoursTattooingStat {
  totalMinutes: number;
  totalHours: number;
}

export interface ExpenseCategoryTotal {
  category: string;
  totalMinor: number;
}

export interface ExpensesByCategoryStat {
  items: ExpenseCategoryTotal[];
  totalMinor: number;
}

export interface DashboardAnalyticsResponse {
  monthLabel: string;
  timeWindow: DashboardAnalyticsTimeWindow;
  takeHome: TakeHomeSummary;
  retention: RetentionStat;
  averageProfitPerSession: AverageProfitPerSessionStat;
  hoursTattooing: HoursTattooingStat;
  expensesByCategory: ExpensesByCategoryStat;
}
