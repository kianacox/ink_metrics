import {
  convertLocalDateTimeInTimezoneToUtcIso,
  getDefaultReportingTimezone,
  formatDateTimeLocalForTimezone,
  getEffectiveReportingTimezone,
  getDateRangeStartUtcIso,
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
  });

  it("formats datetime-local value in the requested timezone", () => {
    const value = formatDateTimeLocalForTimezone(new Date("2026-04-08T10:30:00.000Z"), "UTC");
    expect(value).toBe("2026-04-08T10:30");
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
