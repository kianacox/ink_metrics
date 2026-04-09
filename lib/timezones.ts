const DEFAULT_REPORTING_TIMEZONE = "Europe/London";

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

  const supportedValues = intlWithSupportedValuesOf.supportedValuesOf?.("timeZone");
  if (Array.isArray(supportedValues) && supportedValues.length > 0) {
    return [...supportedValues].sort((left, right) => left.localeCompare(right));
  }

  return [...FALLBACK_TIMEZONES];
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
