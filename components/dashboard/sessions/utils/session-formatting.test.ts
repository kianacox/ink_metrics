import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionProfit,
  mapSessionRowsToListItems,
  type SessionRow,
} from "./session-formatting";

test("maps session rows into list items", () => {
  const rows: SessionRow[] = [
    {
      session_id: "s1",
      price: 5000,
      session_duration: 75,
      created_at: "2026-03-31T10:00:00.000Z",
      clients: { name: "Alice Doe" },
    },
  ];

  assert.deepEqual(mapSessionRowsToListItems(rows), [
    {
      id: "s1",
      clientName: "Alice Doe",
      priceMinor: 5000,
      durationMinutes: 75,
      createdAt: "2026-03-31T10:00:00.000Z",
    },
  ]);
});

test("maps missing row values to safe defaults", () => {
  const rows: SessionRow[] = [
    {
      session_id: "s2",
      price: null,
      session_duration: null,
      created_at: null,
      clients: null,
    },
  ];

  const mapped = mapSessionRowsToListItems(rows);
  assert.equal(mapped[0]?.clientName, "Unknown client");
  assert.equal(mapped[0]?.priceMinor, 0);
  assert.equal(mapped[0]?.durationMinutes, 0);
  assert.equal(typeof mapped[0]?.createdAt, "string");
});

test("supports mapping when clients relation is an array", () => {
  const rows: SessionRow[] = [
    {
      session_id: "s3",
      price: 1000,
      session_duration: 30,
      created_at: "2026-03-30T10:00:00.000Z",
      clients: [{ name: "Bob Stone" }],
    },
  ];

  assert.equal(mapSessionRowsToListItems(rows)[0]?.clientName, "Bob Stone");
});

test("formats duration for mixed and zero values", () => {
  assert.equal(formatSessionDuration(90), "1h 30m");
  assert.equal(formatSessionDuration(60), "1h");
  assert.equal(formatSessionDuration(0), "0m");
});

test("formats profit as a currency string", () => {
  const result = formatSessionProfit(1234, "GBP");
  assert.equal(result.length > 0, true);
});

test("falls back to default currency when code is invalid", () => {
  const result = formatSessionProfit(1000, "INVALID");
  assert.equal(result.length > 0, true);
});

test("formats date for valid ISO and handles invalid date", () => {
  assert.equal(formatSessionDate("2026-03-31T10:00:00.000Z").length > 0, true);
  assert.equal(formatSessionDate("invalid-date"), "Unknown date");
});
