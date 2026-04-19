import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionProfit,
  mapSessionRowsToListItems,
  type SessionRow,
} from "./session-formatting";
import { getDefaultReportingTimezone } from "@/lib/timezones";

describe("session-formatting utils", () => {
  it("maps session rows into list items", () => {
    const rows: SessionRow[] = [
      {
        session_id: "s1",
        price: 5000,
        session_duration: 75,
        session_at: "2026-03-31T10:00:00.000Z",
        created_at: "2026-03-31T10:00:00.000Z",
        clients: { name: "Alice Doe" },
      },
    ];

    expect(mapSessionRowsToListItems(rows)).toEqual([
      {
        id: "s1",
        clientName: "Alice Doe",
        priceMinor: 5000,
        durationMinutes: 75,
        createdAt: "2026-03-31T10:00:00.000Z",
        throughAds: false,
        inProgress: false,
        isLatestForClient: true,
      },
    ]);
  });

  it("maps missing row values to safe defaults", () => {
    const rows: SessionRow[] = [
      {
        session_id: "s2",
        price: null,
        session_duration: null,
        session_at: null,
        created_at: null,
        clients: null,
      },
    ];

    const mapped = mapSessionRowsToListItems(rows);
    expect(mapped[0]?.clientName).toBe("Unknown client");
    expect(mapped[0]?.priceMinor).toBe(0);
    expect(mapped[0]?.durationMinutes).toBe(0);
    expect(typeof mapped[0]?.createdAt).toBe("string");
    expect(mapped[0]?.throughAds).toBe(false);
    expect(mapped[0]?.inProgress).toBe(false);
    expect(mapped[0]?.isLatestForClient).toBe(true);
  });

  it("supports mapping when clients relation is an array", () => {
    const rows: SessionRow[] = [
      {
        session_id: "s3",
        price: 1000,
        session_duration: 30,
        session_at: "2026-03-30T10:00:00.000Z",
        created_at: "2026-03-30T10:00:00.000Z",
        clients: [{ name: "Bob Stone" }],
      },
    ];

    expect(mapSessionRowsToListItems(rows)[0]?.clientName).toBe("Bob Stone");
  });

  it("maps through_ads to throughAds list item field", () => {
    const rows: SessionRow[] = [
      {
        session_id: "s4",
        price: 2200,
        session_duration: 45,
        session_at: "2026-03-30T11:00:00.000Z",
        through_ads: true,
        clients: { name: "Ari" },
      },
    ];

    expect(mapSessionRowsToListItems(rows)[0]?.throughAds).toBe(true);
  });

  it("formats duration for mixed and zero values", () => {
    expect(formatSessionDuration(90)).toBe("1h 30m");
    expect(formatSessionDuration(60)).toBe("1h");
    expect(formatSessionDuration(0)).toBe("0m");
  });

  it("formats profit as a currency string", () => {
    const result = formatSessionProfit(1234, "GBP");
    expect(result.length > 0).toBe(true);
  });

  it("falls back to default currency when code is invalid", () => {
    const result = formatSessionProfit(1000, "INVALID");
    expect(result.length > 0).toBe(true);
  });

  it("formats date for valid ISO and handles invalid date", () => {
    const utcDate = formatSessionDate("2026-03-31T10:00:00.000Z", "UTC");
    const newYorkDate = formatSessionDate("2026-03-31T10:00:00.000Z", "America/New_York");
    expect(utcDate.length > 0).toBe(true);
    expect(newYorkDate.length > 0).toBe(true);
    expect(newYorkDate).not.toBe(utcDate);
    expect(formatSessionDate("invalid-date")).toBe("Unknown date");
  });

  it("falls back to default reporting timezone for unsupported timezone values", () => {
    const unsupportedTimezoneDate = formatSessionDate(
      "2026-03-31T10:00:00.000Z",
      "Mars/Phobos",
    );
    const defaultTimezoneDate = formatSessionDate(
      "2026-03-31T10:00:00.000Z",
      getDefaultReportingTimezone(),
    );

    expect(unsupportedTimezoneDate).toBe(defaultTimezoneDate);
  });
});
