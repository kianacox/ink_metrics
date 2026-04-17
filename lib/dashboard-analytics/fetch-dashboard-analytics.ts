import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEmptyAnalyticsResponse,
  computeCurrentMonthWindow,
  type DashboardAnalyticsResponse,
} from "@/lib/dashboard-analytics";
import { getDefaultReportingTimezone, getEffectiveReportingTimezone } from "@/lib/timezones";

export const DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH_CODE =
  "DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH";

export class DashboardAnalyticsMonthParamError extends Error {
  readonly code = DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH_CODE;

  constructor() {
    super("Only month=current is supported.");
  }
}

interface TakeHomeSummaryRpcRow {
  gross_minor: number | string | null;
  paid_to_studio_minor: number | string | null;
  total_expenses_minor: number | string | null;
  net_minor: number | string | null;
}

interface RetentionRpcRow {
  unique_clients_in_month: number | string | null;
  clients_with_2plus_sessions_in_month: number | string | null;
}

function toSafeInt(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const normalized = Math.trunc(parsed);
  return Object.is(normalized, -0) ? 0 : normalized;
}

function toSafeRate({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}): number {
  if (denominator <= 0) {
    return 0;
  }

  const rawRate = numerator / denominator;
  if (!Number.isFinite(rawRate)) {
    return 0;
  }

  const normalizedRate = Object.is(rawRate, -0) ? 0 : rawRate;
  return normalizedRate < 0 ? 0 : normalizedRate;
}

export function assertSupportedDashboardAnalyticsMonth(monthParam: string | null): void {
  if (monthParam && monthParam !== "current") {
    throw new DashboardAnalyticsMonthParamError();
  }
}

async function fetchReportingTimezone({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<string> {
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("reporting_timezone")
    .eq("user_id", userId)
    .limit(1);

  if (profileError) {
    throw new Error("Could not load dashboard analytics profile settings.");
  }

  return getEffectiveReportingTimezone(
    profileRows?.[0]?.reporting_timezone ?? getDefaultReportingTimezone(),
  );
}

export async function fetchDashboardAnalytics({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<DashboardAnalyticsResponse> {
  const reportingTimezone = await fetchReportingTimezone({ supabase, userId });
  const monthWindow = computeCurrentMonthWindow({
    timezone: reportingTimezone,
  });
  const emptyResponse = buildEmptyAnalyticsResponse(monthWindow);
  const { data: takeHomeRows, error: takeHomeError } = await supabase.rpc(
    "compute_dashboard_take_home_summary",
    {
      p_user_id: userId,
      p_month_start_utc: monthWindow.startUtcIso,
      p_month_end_utc: monthWindow.endUtcIso,
      p_reporting_timezone: monthWindow.timezone,
      p_month_start_local_date: monthWindow.monthStartLocalDate,
      p_month_end_local_date: monthWindow.monthEndLocalDate,
    },
  );
  if (takeHomeError) {
    throw new Error("Could not compute dashboard take-home metrics.");
  }

  const takeHome = ((takeHomeRows ?? [])[0] ?? null) as TakeHomeSummaryRpcRow | null;
  const { data: retentionRows, error: retentionError } = await supabase.rpc(
    "compute_dashboard_client_retention",
    {
      p_user_id: userId,
      p_month_start_utc: monthWindow.startUtcIso,
      p_month_end_utc: monthWindow.endUtcIso,
      p_reporting_timezone: monthWindow.timezone,
      p_month_start_local_date: monthWindow.monthStartLocalDate,
      p_month_end_local_date: monthWindow.monthEndLocalDate,
    },
  );
  if (retentionError) {
    throw new Error("Could not compute dashboard retention metrics.");
  }
  const retention = ((retentionRows ?? [])[0] ?? null) as RetentionRpcRow | null;
  const retentionDenominator = toSafeInt(retention?.unique_clients_in_month);
  const retentionNumerator = toSafeInt(retention?.clients_with_2plus_sessions_in_month);

  return {
    ...emptyResponse,
    takeHome: {
      grossMinor: toSafeInt(takeHome?.gross_minor),
      paidToStudioMinor: toSafeInt(takeHome?.paid_to_studio_minor),
      totalExpensesMinor: toSafeInt(takeHome?.total_expenses_minor),
      netMinor: toSafeInt(takeHome?.net_minor),
    },
    retention: {
      numerator: retentionNumerator,
      denominator: retentionDenominator,
      rate: toSafeRate({
        numerator: retentionNumerator,
        denominator: retentionDenominator,
      }),
    },
  };
}
