import {
  formatDateForDisplay,
  formatDateToYYYYMMDD,
  parseDateString,
} from "./date-format";

describe("parseDateString", () => {
  it("returns a Date constructed via local year/month/day for a valid YYYY-MM-DD", () => {
    const parsed = parseDateString("2024-06-15");
    expect(parsed).toBeInstanceOf(Date);
    // Must use local-time constructor (year, month-1, day) — NOT new Date("YYYY-MM-DD")
    // which would be interpreted as UTC midnight and shift in negative-UTC timezones.
    expect(parsed?.getFullYear()).toBe(2024);
    expect(parsed?.getMonth()).toBe(5); // June is month index 5
    expect(parsed?.getDate()).toBe(15);
  });

  it("returns undefined for an empty string", () => {
    expect(parseDateString("")).toBeUndefined();
  });

  it("returns undefined for a malformed string", () => {
    expect(parseDateString("2024-6-15")).toBeUndefined();
    expect(parseDateString("06/15/2024")).toBeUndefined();
    expect(parseDateString("not-a-date")).toBeUndefined();
  });
});

describe("formatDateToYYYYMMDD", () => {
  it("formats a Date as YYYY-MM-DD with zero-padded month and day", () => {
    const date = new Date(2024, 0, 5); // 5 Jan 2024
    expect(formatDateToYYYYMMDD(date)).toBe("2024-01-05");
  });

  it("round-trips with parseDateString", () => {
    const original = "2023-11-30";
    const parsed = parseDateString(original);
    expect(parsed).toBeDefined();
    expect(formatDateToYYYYMMDD(parsed!)).toBe(original);
  });
});

describe("formatDateForDisplay", () => {
  it("returns 'Pick a date' for an empty string", () => {
    expect(formatDateForDisplay("")).toBe("Pick a date");
  });

  it("returns 'Pick a date' for a malformed input", () => {
    expect(formatDateForDisplay("not-a-date")).toBe("Pick a date");
  });

  it("returns a non-empty locale-formatted label for a valid date", () => {
    const label = formatDateForDisplay("2024-06-15");
    expect(label).not.toBe("Pick a date");
    expect(label.length).toBeGreaterThan(0);
  });
});
