import { DateTime, IANAZone } from "luxon";

const DEFAULT_REPORTING_TIMEZONE = "Europe/London";
const DATE_TIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const FALLBACK_TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
] as const;

let cachedTimezones: string[] | null = null;
let cachedTimezoneSet: Set<string> | null = null;

function resolveSupportedTimezones(): string[] {
  const intlWithSupportedValuesOf = Intl as Intl.DateTimeFormatOptions & {
    supportedValuesOf?: (key: string) => string[];
  };

  const supportedValues = intlWithSupportedValuesOf.supportedValuesOf?.("timeZone") ?? [];
  const candidateValues =
    supportedValues.length > 0 ? supportedValues : [...FALLBACK_TIMEZONES];
  const validatedValues = candidateValues.filter((timezone) => IANAZone.isValidZone(timezone));
  const valuesWithUtc = validatedValues.includes("UTC")
    ? validatedValues
    : [...validatedValues, "UTC"];
  const uniqueValues = [...new Set(valuesWithUtc)];
  if (uniqueValues.length > 0) {
    return uniqueValues.sort((left, right) => left.localeCompare(right));
  }

  return [...FALLBACK_TIMEZONES];
}

function parseDateTimeLocal(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} | null {
  const normalizedInput = value.trim();
  const match = DATE_TIME_LOCAL_PATTERN.exec(normalizedInput);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);
  const hour = Number.parseInt(match[4] ?? "", 10);
  const minute = Number.parseInt(match[5] ?? "", 10);
  const second = Number.parseInt(match[6] ?? "0", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return null;
  }

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const dateOnly = DateTime.fromObject(
    {
      year,
      month,
      day,
    },
    {
      zone: "UTC",
    },
  );
  if (!dateOnly.isValid) {
    return null;
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
  };
}

function toUtcIso(dateTime: DateTime): string | null {
  const utcDateTime = dateTime.toUTC();
  if (!utcDateTime.isValid) {
    return null;
  }
  return utcDateTime.toISO({ suppressMilliseconds: false });
}

export function getSupportedTimezones(): string[] {
  if (!cachedTimezones) {
    cachedTimezones = resolveSupportedTimezones();
  }

  return cachedTimezones;
}

export function isSupportedTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  if (!cachedTimezoneSet) {
    cachedTimezoneSet = new Set(getSupportedTimezones());
  }

  return cachedTimezoneSet.has(value);
}

export function detectBrowserTimezone(): string | null {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (isSupportedTimezone(browserTimezone)) {
    return browserTimezone;
  }

  return null;
}

export function getDefaultReportingTimezone(): string {
  return DEFAULT_REPORTING_TIMEZONE;
}

export function getEffectiveReportingTimezone(value: unknown): string {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (isSupportedTimezone(trimmedValue)) {
      return trimmedValue;
    }
  }
  return DEFAULT_REPORTING_TIMEZONE;
}

export type SessionDateRangePreset = "last30Days" | "last90Days" | "yearToDate" | "allTime";

export function convertLocalDateTimeInTimezoneToUtcIso(
  localDateTime: string,
  timezone: string,
): string | null {
  const effectiveTimezone = getEffectiveReportingTimezone(timezone);
  if (!isSupportedTimezone(timezone)) {
    return null;
  }

  const parsedValue = parseDateTimeLocal(localDateTime);
  if (!parsedValue) {
    return null;
  }

  const dateTime = DateTime.fromObject(parsedValue, {
    zone: effectiveTimezone,
  });
  if (!dateTime.isValid) {
    return null;
  }

  // Reject nonexistent/shifted local wall times during DST transitions.
  if (
    dateTime.year !== parsedValue.year ||
    dateTime.month !== parsedValue.month ||
    dateTime.day !== parsedValue.day ||
    dateTime.hour !== parsedValue.hour ||
    dateTime.minute !== parsedValue.minute ||
    dateTime.second !== parsedValue.second
  ) {
    return null;
  }

  return toUtcIso(dateTime);
}

export function formatDateTimeLocalForTimezone(date: Date, timezone: string): string {
  const effectiveTimezone = getEffectiveReportingTimezone(timezone);
  const dateTime = DateTime.fromJSDate(date, { zone: "UTC" }).setZone(effectiveTimezone);
  if (!dateTime.isValid) {
    return DateTime.fromJSDate(date, { zone: DEFAULT_REPORTING_TIMEZONE }).toFormat(
      "yyyy-LL-dd'T'HH:mm",
    );
  }

  return dateTime.toFormat("yyyy-LL-dd'T'HH:mm");
}

export function getDateRangeStartUtcIso({
  preset,
  timezone,
  now = new Date(),
}: {
  preset: SessionDateRangePreset;
  timezone: string;
  now?: Date;
}): string | null {
  if (preset === "allTime") {
    return null;
  }

  const effectiveTimezone = getEffectiveReportingTimezone(timezone);
  const nowInTimezone = DateTime.fromJSDate(now, { zone: "UTC" }).setZone(effectiveTimezone);
  if (!nowInTimezone.isValid) {
    return null;
  }

  if (preset === "yearToDate") {
    return toUtcIso(nowInTimezone.startOf("year"));
  }

  const daysBack = preset === "last30Days" ? 30 : 90;
  return toUtcIso(nowInTimezone.minus({ days: daysBack }));
}
