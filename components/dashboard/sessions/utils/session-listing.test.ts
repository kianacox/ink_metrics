import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSessionsByClientName,
  getVisibleSessions,
  normalizeSearchQuery,
  sortSessions,
  type SessionListItem,
} from "./session-listing";

const sessions: SessionListItem[] = [
  {
    id: "s1",
    clientName: "Bob Stone",
    priceMinor: 8000,
    durationMinutes: 45,
    createdAt: "2026-03-30T10:00:00.000Z",
  },
  {
    id: "s2",
    clientName: "Alice Doe",
    priceMinor: 12000,
    durationMinutes: 90,
    createdAt: "2026-03-31T10:00:00.000Z",
  },
  {
    id: "s3",
    clientName: "bob junior",
    priceMinor: 12000,
    durationMinutes: 30,
    createdAt: "2026-03-29T10:00:00.000Z",
  },
];

test("normalizes search query by trimming and lowercasing", () => {
  assert.equal(normalizeSearchQuery("  ALIce  "), "alice");
});

test("filters sessions by client name case-insensitively", () => {
  assert.deepEqual(
    filterSessionsByClientName(sessions, "  bOb ").map((session) => session.id),
    ["s1", "s3"],
  );
});

test("returns original sessions when search query is empty", () => {
  assert.deepEqual(filterSessionsByClientName(sessions, "   "), sessions);
});

test("sorts by date descending by default", () => {
  assert.deepEqual(sortSessions(sessions).map((session) => session.id), [
    "s2",
    "s1",
    "s3",
  ]);
});

test("sorts by duration ascending", () => {
  assert.deepEqual(
    sortSessions(sessions, { field: "duration", direction: "asc" }).map(
      (session) => session.id,
    ),
    ["s3", "s1", "s2"],
  );
});

test("sorts by profit descending and keeps stable order on ties", () => {
  assert.deepEqual(
    sortSessions(sessions, { field: "profit", direction: "desc" }).map(
      (session) => session.id,
    ),
    ["s2", "s3", "s1"],
  );
});

test("falls back to default sorting for invalid sort state", () => {
  assert.deepEqual(
    sortSessions(sessions, {
      field: "not-valid" as never,
      direction: "not-valid" as never,
    }).map((session) => session.id),
    ["s2", "s1", "s3"],
  );
});

test("combines filtering and sorting in getVisibleSessions", () => {
  assert.deepEqual(
    getVisibleSessions(sessions, "bob", {
      field: "duration",
      direction: "desc",
    }).map((session) => session.id),
    ["s1", "s3"],
  );
});

test("returns empty list when source sessions are empty", () => {
  assert.deepEqual(getVisibleSessions([], "alice"), []);
});
