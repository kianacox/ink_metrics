const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatYYYYMM(year: number, monthIndex: number): string {
  // monthIndex is 0-based; convert to 1-based for the YYYY-MM string.
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function parseYYYYMM(yyyyMm: string): { year: number; month: number } {
  const [year, month] = yyyyMm.split("-").map(Number);
  return { year, month };
}

/**
 * Returns the YYYY-MM string for the month preceding the given YYYY-MM.
 * Rolls over correctly across year boundaries.
 */
export function prevMonth(yyyyMm: string): string {
  const { year, month } = parseYYYYMM(yyyyMm);
  // month - 2 because JS Date months are 0-indexed; subtracting another 1 walks back a month.
  const d = new Date(year, month - 2, 1);
  return formatYYYYMM(d.getFullYear(), d.getMonth());
}

/**
 * Returns the YYYY-MM string for the month following the given YYYY-MM.
 * Rolls over correctly across year boundaries.
 */
export function nextMonth(yyyyMm: string): string {
  const { year, month } = parseYYYYMM(yyyyMm);
  // month is 1-based; constructing a Date with month (0-indexed) yields the next month.
  const d = new Date(year, month, 1);
  return formatYYYYMM(d.getFullYear(), d.getMonth());
}

/**
 * Returns the current month as a YYYY-MM string in the user's local time.
 */
export function currentYYYYMM(): string {
  const d = new Date();
  return formatYYYYMM(d.getFullYear(), d.getMonth());
}

/**
 * Splits a YYYY-MM string into a human-readable month label (e.g. "March") and year.
 */
export function formatMonthLabel(yyyyMm: string): {
  monthLabel: string;
  year: number;
} {
  const { year, month } = parseYYYYMM(yyyyMm);
  return {
    monthLabel: MONTH_NAMES[month - 1] ?? "",
    year,
  };
}
