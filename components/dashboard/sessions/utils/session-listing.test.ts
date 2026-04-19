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
    throughAds: false,
    inProgress: false,
    isLatestForClient: true,
  },
  {
    id: "s2",
    clientName: "Alice Doe",
    priceMinor: 12000,
    durationMinutes: 90,
    createdAt: "2026-03-31T10:00:00.000Z",
    throughAds: false,
    inProgress: false,
    isLatestForClient: true,
  },
  {
    id: "s3",
    clientName: "bob junior",
    priceMinor: 12000,
    durationMinutes: 30,
    createdAt: "2026-03-29T10:00:00.000Z",
    throughAds: true,
    inProgress: false,
    isLatestForClient: true,
  },
];

describe("session-listing utils", () => {
  it("normalizes search query by trimming and lowercasing", () => {
    expect(normalizeSearchQuery("  ALIce  ")).toBe("alice");
  });

  it("filters sessions by client name case-insensitively", () => {
    expect(
      filterSessionsByClientName(sessions, "  bOb ").map((session) => session.id),
    ).toEqual(["s1", "s3"]);
  });

  it("returns original sessions when search query is empty", () => {
    expect(filterSessionsByClientName(sessions, "   ")).toEqual(sessions);
  });

  it("sorts by date descending by default", () => {
    expect(sortSessions(sessions).map((session) => session.id)).toEqual([
      "s2",
      "s1",
      "s3",
    ]);
  });

  it("sorts by duration ascending", () => {
    expect(
      sortSessions(sessions, { field: "duration", direction: "asc" }).map(
        (session) => session.id,
      ),
    ).toEqual(["s3", "s1", "s2"]);
  });

  it("sorts by profit descending and keeps stable order on ties", () => {
    expect(
      sortSessions(sessions, { field: "profit", direction: "desc" }).map(
        (session) => session.id,
      ),
    ).toEqual(["s2", "s3", "s1"]);
  });

  it("falls back to default sorting for invalid sort state", () => {
    expect(
      sortSessions(sessions, {
        field: "not-valid" as never,
        direction: "not-valid" as never,
      }).map((session) => session.id),
    ).toEqual(["s2", "s1", "s3"]);
  });

  it("combines filtering and sorting in getVisibleSessions", () => {
    expect(
      getVisibleSessions(sessions, "bob", {
        field: "duration",
        direction: "desc",
      }).map((session) => session.id),
    ).toEqual(["s1", "s3"]);
  });

  it("returns empty list when source sessions are empty", () => {
    expect(getVisibleSessions([], "alice")).toEqual([]);
  });
});
