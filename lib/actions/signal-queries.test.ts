import {
  computeInProgressSignals,
  computeLapsedRepeatSignals,
  computeNewClientSignals,
  IN_PROGRESS_THRESHOLD_DAYS,
  LAPSED_REPEAT_THRESHOLD_DAYS,
  NEW_CLIENT_THRESHOLD_DAYS,
  resolveUpsertOperation,
} from "@/lib/actions/signal-queries";
import type { ClientAction, SessionRow } from "@/lib/actions/models";

const NOW = new Date("2026-04-19T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeSession(overrides: Partial<SessionRow> & { clientId: string }): SessionRow {
  return {
    sessionId: "session-" + Math.random(),
    priceMinor: 10000,
    sessionAt: daysAgo(10),
    inProgress: false,
    ...overrides,
  };
}

function makeAction(overrides: Partial<ClientAction> = {}): ClientAction {
  return {
    actionId: "action-1",
    userId: "user-1",
    clientId: "client-1",
    actionType: "lapsed_repeat",
    sessionId: null,
    revenueAtRiskMinor: 10000,
    dismissedAt: null,
    createdAt: daysAgo(10),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeLapsedRepeatSignals
// ---------------------------------------------------------------------------

describe("computeLapsedRepeatSignals", () => {
  it("returns signal for client with 2+ sessions, most recent beyond threshold", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(60), priceMinor: 8000 }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(90), priceMinor: 12000 }),
    ];
    const signals = computeLapsedRepeatSignals(sessions, NOW);
    expect(signals).toHaveLength(1);
    expect(signals[0].clientId).toBe("c1");
    expect(signals[0].revenueAtRiskMinor).toBe(10000); // avg(8000, 12000)
  });

  it("excludes client with only 1 session", () => {
    const sessions = [makeSession({ clientId: "c1", sessionAt: daysAgo(60) })];
    expect(computeLapsedRepeatSignals(sessions, NOW)).toHaveLength(0);
  });

  it("excludes client whose most recent session is within threshold", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(30) }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(90) }),
    ];
    expect(computeLapsedRepeatSignals(sessions, NOW)).toHaveLength(0);
  });

  it("includes client whose most recent session is exactly at threshold boundary", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(LAPSED_REPEAT_THRESHOLD_DAYS) }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(80) }),
    ];
    expect(computeLapsedRepeatSignals(sessions, NOW)).toHaveLength(1);
  });

  it("rounds average price correctly", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(60), priceMinor: 10000 }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(70), priceMinor: 10001 }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(80), priceMinor: 10001 }),
    ];
    const signals = computeLapsedRepeatSignals(sessions, NOW);
    expect(signals[0].revenueAtRiskMinor).toBe(Math.round((10000 + 10001 + 10001) / 3));
  });

  it("returns empty when no sessions provided", () => {
    expect(computeLapsedRepeatSignals([], NOW)).toHaveLength(0);
  });

  it("handles multiple qualifying clients independently", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(60), priceMinor: 5000 }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(70), priceMinor: 5000 }),
      makeSession({ clientId: "c2", sessionAt: daysAgo(65), priceMinor: 9000 }),
      makeSession({ clientId: "c2", sessionAt: daysAgo(75), priceMinor: 9000 }),
    ];
    const signals = computeLapsedRepeatSignals(sessions, NOW);
    expect(signals).toHaveLength(2);
    const clientIds = signals.map((s) => s.clientId).sort();
    expect(clientIds).toEqual(["c1", "c2"]);
  });
});

// ---------------------------------------------------------------------------
// computeNewClientSignals
// ---------------------------------------------------------------------------

describe("computeNewClientSignals", () => {
  it("returns signal for client with exactly 1 session beyond threshold", () => {
    const sessions = [makeSession({ clientId: "c1", sessionAt: daysAgo(50), priceMinor: 7000 })];
    const signals = computeNewClientSignals(sessions, NOW);
    expect(signals).toHaveLength(1);
    expect(signals[0].clientId).toBe("c1");
    expect(signals[0].revenueAtRiskMinor).toBe(7000);
  });

  it("excludes client with 2+ sessions", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(50) }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(70) }),
    ];
    expect(computeNewClientSignals(sessions, NOW)).toHaveLength(0);
  });

  it("excludes client whose single session is within threshold", () => {
    const sessions = [makeSession({ clientId: "c1", sessionAt: daysAgo(30) })];
    expect(computeNewClientSignals(sessions, NOW)).toHaveLength(0);
  });

  it("includes client whose session is exactly at threshold boundary", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(NEW_CLIENT_THRESHOLD_DAYS) }),
    ];
    expect(computeNewClientSignals(sessions, NOW)).toHaveLength(1);
  });

  it("returns empty when no sessions provided", () => {
    expect(computeNewClientSignals([], NOW)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeInProgressSignals
// ---------------------------------------------------------------------------

describe("computeInProgressSignals", () => {
  it("returns signal when most recent session is in_progress and beyond threshold", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(35), inProgress: true, priceMinor: 6000, sessionId: "s1" }),
    ];
    const signals = computeInProgressSignals(sessions, NOW);
    expect(signals).toHaveLength(1);
    expect(signals[0].clientId).toBe("c1");
    expect(signals[0].sessionId).toBe("s1");
    expect(signals[0].revenueAtRiskMinor).toBe(6000);
  });

  it("excludes when most recent session is not in_progress", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(35), inProgress: false }),
    ];
    expect(computeInProgressSignals(sessions, NOW)).toHaveLength(0);
  });

  it("excludes when in_progress session is within threshold", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(20), inProgress: true }),
    ];
    expect(computeInProgressSignals(sessions, NOW)).toHaveLength(0);
  });

  it("auto-resolves when newer non-in_progress session exists", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(35), inProgress: true, sessionId: "s1" }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(5), inProgress: false, sessionId: "s2" }),
    ];
    expect(computeInProgressSignals(sessions, NOW)).toHaveLength(0);
  });

  it("uses most recent session for in_progress check", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(60), inProgress: true, sessionId: "s1" }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(35), inProgress: true, sessionId: "s2" }),
    ];
    const signals = computeInProgressSignals(sessions, NOW);
    expect(signals).toHaveLength(1);
    expect(signals[0].sessionId).toBe("s2");
  });

  it("includes client whose session is exactly at threshold boundary", () => {
    const sessions = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(IN_PROGRESS_THRESHOLD_DAYS), inProgress: true }),
    ];
    expect(computeInProgressSignals(sessions, NOW)).toHaveLength(1);
  });

  it("returns empty when no sessions provided", () => {
    expect(computeInProgressSignals([], NOW)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// resolveUpsertOperation
// ---------------------------------------------------------------------------

describe("resolveUpsertOperation", () => {
  it("returns insert when no existing action", () => {
    expect(resolveUpsertOperation(null, 56, NOW)).toBe("insert");
  });

  it("returns skip when existing action is active (not dismissed)", () => {
    const action = makeAction({ dismissedAt: null });
    expect(resolveUpsertOperation(action, 56, NOW)).toBe("skip");
  });

  it("returns skip when dismissed within suppression window", () => {
    const action = makeAction({ dismissedAt: daysAgo(30) });
    expect(resolveUpsertOperation(action, 56, NOW)).toBe("skip");
  });

  it("returns reactivate when dismissed past suppression window", () => {
    const action = makeAction({ dismissedAt: daysAgo(57) });
    expect(resolveUpsertOperation(action, 56, NOW)).toBe("reactivate");
  });

  it("returns reactivate exactly at threshold boundary", () => {
    const action = makeAction({ dismissedAt: daysAgo(56) });
    expect(resolveUpsertOperation(action, 56, NOW)).toBe("reactivate");
  });

  it("uses correct threshold per action type", () => {
    const dismissedAt = daysAgo(43);
    const lapsed = makeAction({ dismissedAt, actionType: "lapsed_repeat" });
    const newClient = makeAction({ dismissedAt, actionType: "new_client" });

    expect(resolveUpsertOperation(lapsed, LAPSED_REPEAT_THRESHOLD_DAYS, NOW)).toBe("skip");
    expect(resolveUpsertOperation(newClient, NEW_CLIENT_THRESHOLD_DAYS, NOW)).toBe("reactivate");
  });
});
