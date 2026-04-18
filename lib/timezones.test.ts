import {
  convertLocalDateTimeInTimezoneToUtcIso,
  getDefaultReportingTimezone,
  formatDateTimeLocalForTimezone,
  getEffectiveReportingTimezone,
  getDateRangeStartUtcIso,
  getDateRangeStartDate,
} from "./timezones";

describe("timezone helpers", () => {
  it("converts local wall time to UTC using timezone context", () => {
    expect(convertLocalDateTimeInTimezoneToUtcIso("2026-04-08T10:30", "UTC")).toBe(
      "2026-04-08T10:30:00.000Z",
    );
    expect(
      convertLocalDateTimeInTimezoneToUtcIso("2026-04-08T10:30", "Europe/London"),
    ).toBe("2026-04-08T09:30:00.000Z");
  });

  it("returns null for unsupported timezone or invalid local time", () => {
    expect(convertLocalDateTimeInTimezoneToUtcIso("2026-04-08T10:30", "Mars/Phobos")).toBeNull();
    expect(convertLocalDateTimeInTimezoneToUtcIso("not-a-date", "UTC")).toBeNull();
  });

  it("handles DST spring-forward and fall-back edge cases", () => {
    expect(convertLocalDateTimeInTimezoneToUtcIso("2026-03-29T00:30", "Europe/London")).toBe(
      "2026-03-29T00:30:00.000Z",
    );
    expect(convertLocalDateTimeInTimezoneToUtcIso("2026-03-29T01:30", "Europe/London")).toBeNull();

    const ambiguousFallBackIso = convertLocalDateTimeInTimezoneToUtcIso(
      "2026-10-25T01:30",
      "Europe/London",
    );
    expect(["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"]).toContain(
      ambiguousFallBackIso,
    );
  });

  it("computes timezone-aware UTC date range starts", () => {
    const fixedNow = new Date("2026-04-10T12:00:00.000Z");

    expect(
      getDateRangeStartUtcIso({
        preset: "last30Days",
        timezone: "UTC",
        now: fixedNow,
      }),
    ).toBe("2026-03-11T12:00:00.000Z");

    expect(
      getDateRangeStartUtcIso({
        preset: "yearToDate",
        timezone: "UTC",
        now: fixedNow,
      }),
    ).toBe("2026-01-01T00:00:00.000Z");

    expect(
      getDateRangeStartUtcIso({
        preset: "last30Days",
        timezone: "Europe/London",
        now: fixedNow,
      }),
    ).toBe("2026-03-11T13:00:00.000Z");

    expect(
      getDateRangeStartUtcIso({
        preset: "yearToDate",
        timezone: "America/New_York",
        now: fixedNow,
      }),
    ).toBe("2026-01-01T05:00:00.000Z");
    expect(
      getDateRangeStartUtcIso({
        preset: "last90Days",
        timezone: "America/New_York",
        now: fixedNow,
      }),
    ).toBe("2026-01-10T13:00:00.000Z");

    // thisMonth returns midnight on the 1st of the current month in the given
    // timezone — NOT a rolling 30-day window. Verified across UTC, a US
    // timezone (UTC-4 in April, EDT), and Europe/London (UTC+1 in April, BST).
    expect(
      getDateRangeStartUtcIso({
        preset: "thisMonth",
        timezone: "UTC",
        now: fixedNow,
      }),
    ).toBe("2026-04-01T00:00:00.000Z");

    expect(
      getDateRangeStartUtcIso({
        preset: "thisMonth",
        timezone: "America/New_York",
        now: fixedNow,
      }),
    ).toBe("2026-04-01T04:00:00.000Z"); // midnight EDT = UTC+4

    expect(
      getDateRangeStartUtcIso({
        preset: "thisMonth",
        timezone: "Europe/London",
        now: fixedNow,
      }),
    ).toBe("2026-03-31T23:00:00.000Z"); // midnight BST = UTC-1
  });

  it("formats datetime-local value in the requested timezone", () => {
    const value = formatDateTimeLocalForTimezone(new Date("2026-04-08T10:30:00.000Z"), "UTC");
    expect(value).toBe("2026-04-08T10:30");
  });

  it("computes timezone-aware date-only range starts for date columns", () => {
    const fixedNow = new Date("2026-04-10T12:00:00.000Z");

    expect(
      getDateRangeStartDate({ preset: "allTime", timezone: "UTC", now: fixedNow }),
    ).toBeNull();

    expect(
      getDateRangeStartDate({ preset: "last30Days", timezone: "UTC", now: fixedNow }),
    ).toBe("2026-03-11");

    expect(
      getDateRangeStartDate({ preset: "last90Days", timezone: "UTC", now: fixedNow }),
    ).toBe("2026-01-10");

    expect(
      getDateRangeStartDate({ preset: "yearToDate", timezone: "UTC", now: fixedNow }),
    ).toBe("2026-01-01");

    expect(
      getDateRangeStartDate({ preset: "thisMonth", timezone: "UTC", now: fixedNow }),
    ).toBe("2026-04-01");

    // Asia/Tokyo is UTC+9 — midnight on 2026-04-01 Tokyo = 2026-03-31 15:00 UTC.
    // The date returned should be the Tokyo date, not the UTC date.
    expect(
      getDateRangeStartDate({ preset: "thisMonth", timezone: "Asia/Tokyo", now: fixedNow }),
    ).toBe("2026-04-01");

    // last30Days from 2026-04-10 12:00 UTC in Asia/Tokyo (UTC+9) = 2026-04-10 21:00 JST.
    // 30 days prior = 2026-03-11 21:00 JST → date portion is 2026-03-11.
    expect(
      getDateRangeStartDate({ preset: "last30Days", timezone: "Asia/Tokyo", now: fixedNow }),
    ).toBe("2026-03-11");
  });

  it("falls back to default reporting timezone when unsupported", () => {
    expect(getEffectiveReportingTimezone("Mars/Phobos")).toBe(getDefaultReportingTimezone());

    expect(
      getDateRangeStartUtcIso({
        preset: "yearToDate",
        timezone: "Mars/Phobos",
        now: new Date("2026-04-10T12:00:00.000Z"),
      }),
    ).toBe(
      getDateRangeStartUtcIso({
        preset: "yearToDate",
        timezone: getDefaultReportingTimezone(),
        now: new Date("2026-04-10T12:00:00.000Z"),
      }),
    );
  });
});
