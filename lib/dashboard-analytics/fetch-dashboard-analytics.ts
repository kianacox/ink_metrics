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

  return buildEmptyAnalyticsResponse(monthWindow);
}
