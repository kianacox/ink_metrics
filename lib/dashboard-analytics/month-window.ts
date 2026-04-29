import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveReportingTimezone } from "@/lib/timezones";
import type { DashboardAnalyticsTimeWindow } from "@/lib/dashboard-analytics/models";

export interface DashboardMonthWindow extends DashboardAnalyticsTimeWindow {
  monthLabel: string;
  monthStartLocalDate: string;
  monthEndLocalDate: string;
}

const MONTH_PARAM_FORMAT = "yyyy-LL";

function toUtcIso(value: DateTime): string {
  const utcValue = value.toUTC();
  const isoValue = utcValue.toISO({ suppressMilliseconds: false });
  if (!isoValue) {
    throw new Error("Could not compute dashboard month window.");
  }

  return isoValue;
}

function buildMonthWindow(
  monthStartLocal: DateTime,
  effectiveTimezone: string,
): DashboardMonthWindow {
  const monthEndLocal = monthStartLocal.plus({ months: 1 });

  return {
    startUtcIso: toUtcIso(monthStartLocal),
    endUtcIso: toUtcIso(monthEndLocal),
    timezone: effectiveTimezone,
    monthLabel: monthStartLocal.toFormat("LLLL"),
    monthStartLocalDate: monthStartLocal.toFormat("yyyy-LL-dd"),
    monthEndLocalDate: monthEndLocal.toFormat("yyyy-LL-dd"),
  };
}

export function computeCurrentMonthWindow({
  timezone,
  now = new Date(),
}: {
  timezone: string;
  now?: Date;
}): DashboardMonthWindow {
  const effectiveTimezone = getEffectiveReportingTimezone(timezone);
  const nowInTimezone = DateTime.fromJSDate(now, { zone: "UTC" }).setZone(
    effectiveTimezone,
  );

  if (!nowInTimezone.isValid) {
    throw new Error("Could not compute dashboard month window.");
  }

  return buildMonthWindow(nowInTimezone.startOf("month"), effectiveTimezone);
}

export function parseMonthParam(
  monthParam: string,
  timezone: string,
  now: Date = new Date(),
): DashboardMonthWindow {
  const effectiveTimezone = getEffectiveReportingTimezone(timezone);

  if (monthParam === "current") {
    return computeCurrentMonthWindow({ timezone: effectiveTimezone, now });
  }

  const dt = DateTime.fromFormat(monthParam, MONTH_PARAM_FORMAT, {
    zone: effectiveTimezone,
  });
  if (!dt.isValid) {
    throw new Error(`Invalid month param: ${monthParam}`);
  }

  return buildMonthWindow(dt.startOf("month"), effectiveTimezone);
}

export async function hasPriorMonthData({
  supabase,
  userId,
  monthParam,
  timezone,
  now = new Date(),
}: {
  supabase: SupabaseClient;
  userId: string;
  monthParam: string;
  timezone: string;
  now?: Date;
}): Promise<boolean> {
  const currentWindow = parseMonthParam(monthParam, timezone, now);

  const currentStartUtc = DateTime.fromISO(currentWindow.startUtcIso, {
    zone: "UTC",
  });
  const priorMonthStart = currentStartUtc.minus({ months: 1 });
  const priorMonthEnd = currentStartUtc;

  const priorMonthStartIso = priorMonthStart.toISO();
  const priorMonthEndIso = priorMonthEnd.toISO();
  const priorMonthStartDate = priorMonthStart.toISODate();
  const priorMonthEndDate = priorMonthEnd.toISODate();

  if (
    !priorMonthStartIso ||
    !priorMonthEndIso ||
    !priorMonthStartDate ||
    !priorMonthEndDate
  ) {
    throw new Error("Could not compute prior month window for analytics.");
  }

  const [sessionsResult, expensesResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("session_at", priorMonthStartIso)
      .lt("session_at", priorMonthEndIso),
    supabase
      .from("expenses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date_purchased", priorMonthStartDate)
      .lt("date_purchased", priorMonthEndDate),
  ]);

  const sessionCount = sessionsResult.count ?? 0;
  const expenseCount = expensesResult.count ?? 0;

  return sessionCount > 0 || expenseCount > 0;
}
