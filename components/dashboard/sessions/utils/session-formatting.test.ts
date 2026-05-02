import type { SessionRow } from "@/lib/sessions/models";
import {
  formatSessionDate,
  formatSessionProfit,
  mapSessionRowsToListItems,
} from "./session-formatting";

describe("session-formatting utils", () => {
  it("maps session rows into list items", () => {
    const rows: SessionRow[] = [
      {
        session_id: "s1",
        price: 5000,
        session_at: "2026-03-31",
        created_at: "2026-03-31T10:00:00.000Z",
        clients: { name: "Alice Doe" },
      },
    ];

    expect(mapSessionRowsToListItems(rows)).toEqual([
      {
        id: "s1",
        clientName: "Alice Doe",
        priceMinor: 5000,
        sessionDate: "2026-03-31",
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
        session_at: null,
        created_at: null,
        clients: null,
      },
    ];

    const mapped = mapSessionRowsToListItems(rows);
    expect(mapped[0]?.clientName).toBe("Unknown client");
    expect(mapped[0]?.priceMinor).toBe(0);
    expect(mapped[0]?.sessionDate).toBe("");
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
        session_at: "2026-03-30",
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
        session_at: "2026-03-30",
        through_ads: true,
        clients: { name: "Ari" },
      },
    ];

    expect(mapSessionRowsToListItems(rows)[0]?.throughAds).toBe(true);
  });

  it("formats profit as a currency string", () => {
    const result = formatSessionProfit(1234, "GBP");
    expect(result.length > 0).toBe(true);
  });

  it("falls back to default currency when code is invalid", () => {
    const result = formatSessionProfit(1000, "INVALID");
    expect(result.length > 0).toBe(true);
  });

  it("formats a valid date string", () => {
    const result = formatSessionDate("2026-04-22");
    expect(result).not.toBe("Unknown date");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns Unknown date for empty string", () => {
    expect(formatSessionDate("")).toBe("Unknown date");
  });

  it("returns Unknown date for malformed string", () => {
    expect(formatSessionDate("not-a-date")).toBe("Unknown date");
  });
});
