/**
 * Date utilities for working with calendar dates as `YYYY-MM-DD` strings.
 *
 * Calendar dates (no time-of-day, no timezone) flow through the app as
 * strings. These helpers convert between the string form and JS `Date`
 * objects using local time, so a user picking "15 June" always gets
 * "2024-06-15" regardless of timezone.
 */

const YYYY_MM_DD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a `YYYY-MM-DD` string into a `Date` constructed in local time.
 *
 * Uses `new Date(year, month-1, day)` rather than `new Date("YYYY-MM-DD")`
 * to avoid UTC offset shifts that can otherwise move the date by one day
 * in negative-UTC timezones.
 *
 * Returns `undefined` for empty or malformed input.
 */
export function parseDateString(dateString: string): Date | undefined {
  if (!dateString) return undefined;
  const match = dateString.match(YYYY_MM_DD_PATTERN);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Format a `Date` as `YYYY-MM-DD` using its local calendar fields.
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Render a `YYYY-MM-DD` string for display using the user's locale.
 *
 * Returns the placeholder `"Pick a date"` for empty or unparseable input
 * so callers can use it directly as a button label.
 */
export function formatDateForDisplay(dateString: string): string {
  const parsed = parseDateString(dateString);
  if (!parsed) return "Pick a date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}
