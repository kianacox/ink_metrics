import { DateTime } from "luxon";
import { getEffectiveReportingTimezone } from "@/lib/timezones";
import type { DashboardAnalyticsTimeWindow } from "@/lib/dashboard-analytics/models";

export interface DashboardMonthWindow extends DashboardAnalyticsTimeWindow {
  monthLabel: string;
  monthStartLocalDate: string;
  monthEndLocalDate: string;
}

function toUtcIso(value: DateTime): string {
  const utcValue = value.toUTC();
  const isoValue = utcValue.toISO({ suppressMilliseconds: false });
  if (!isoValue) {
    throw new Error("Could not compute dashboard month window.");
  }

  return isoValue;
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

  const monthStartLocal = nowInTimezone.startOf("month");
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
