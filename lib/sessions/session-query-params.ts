import type { SessionSortField } from "@/lib/sessions/models";
import type { SessionDateRangePreset } from "@/lib/timezones";

/**
 * Whitelisted sessions-list query parameter values, plus parsing helpers.
 *
 * The sessions endpoint intentionally omits `thisMonth` from the supported
 * date range presets (the default is `last30Days`). Centralising the
 * accepted values here lets the API handler stay focused on transport.
 */

export const SESSION_VALID_SORT_FIELDS: ReadonlySet<SessionSortField> =
  new Set<SessionSortField>(["date", "profit"]);

export const SESSION_VALID_DATE_RANGES: ReadonlySet<SessionDateRangePreset> =
  new Set<SessionDateRangePreset>([
    "last30Days",
    "last90Days",
    "yearToDate",
    "allTime",
  ]);

const DEFAULT_SESSION_SORT_FIELD: SessionSortField = "date";
const DEFAULT_SESSION_DATE_RANGE: SessionDateRangePreset = "last30Days";

export function isValidSessionSortField(
  value: unknown,
): value is SessionSortField {
  return (
    typeof value === "string" &&
    SESSION_VALID_SORT_FIELDS.has(value as SessionSortField)
  );
}

export function isValidSessionDateRange(
  value: unknown,
): value is SessionDateRangePreset {
  return (
    typeof value === "string" &&
    SESSION_VALID_DATE_RANGES.has(value as SessionDateRangePreset)
  );
}

export function parseSessionSortField(value: string | null): SessionSortField {
  return isValidSessionSortField(value) ? value : DEFAULT_SESSION_SORT_FIELD;
}

export function parseSessionDateRange(
  value: string | null,
): SessionDateRangePreset {
  return isValidSessionDateRange(value) ? value : DEFAULT_SESSION_DATE_RANGE;
}
