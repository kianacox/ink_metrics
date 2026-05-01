import {
  computeSignals,
  executeReconciliation,
  reconcileActions,
  type ReconciliationPlan,
  type Signals,
} from "@/lib/actions/compute-and-upsert-actions";
import {
  IN_PROGRESS_THRESHOLD_DAYS,
  LAPSED_REPEAT_THRESHOLD_DAYS,
  NEW_CLIENT_THRESHOLD_DAYS,
} from "@/lib/actions/signal-queries";
import type { ClientAction, SessionRow } from "@/lib/actions/models";

const NOW = new Date("2026-04-19T12:00:00.000Z");
const USER_ID = "user-1";

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
    userId: USER_ID,
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
// computeSignals
// ---------------------------------------------------------------------------

describe("computeSignals", () => {
  it("returns empty arrays when no sessions are provided", () => {
    const result = computeSignals([], NOW);
    expect(result).toEqual({ lapsedRepeat: [], newClient: [], inProgress: [] });
  });

  it("collects all three signal types in a single sweep", () => {
    const sessions: SessionRow[] = [
      // lapsed_repeat: 2 sessions for c1, most recent past 56 days
      makeSession({ clientId: "c1", sessionAt: daysAgo(60), priceMinor: 8000 }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(120), priceMinor: 12000 }),
      // new_client: 1 session for c2 past 42 days
      makeSession({ clientId: "c2", sessionAt: daysAgo(50), priceMinor: 5000 }),
      // in_progress: most recent session in_progress past 28 days
      makeSession({
        clientId: "c3",
        sessionId: "s3",
        sessionAt: daysAgo(30),
        inProgress: true,
        priceMinor: 7000,
      }),
    ];

    const result = computeSignals(sessions, NOW);

    expect(result.lapsedRepeat).toEqual([{ clientId: "c1", revenueAtRiskMinor: 10000 }]);
    expect(result.newClient).toEqual([{ clientId: "c2", revenueAtRiskMinor: 5000 }]);
    expect(result.inProgress).toEqual([
      { clientId: "c3", sessionId: "s3", revenueAtRiskMinor: 7000 },
    ]);
  });

  it("does not produce signals when no client crosses any threshold", () => {
    const sessions: SessionRow[] = [
      makeSession({ clientId: "c1", sessionAt: daysAgo(5) }),
      makeSession({ clientId: "c1", sessionAt: daysAgo(2) }),
    ];
    const result = computeSignals(sessions, NOW);
    expect(result.lapsedRepeat).toHaveLength(0);
    expect(result.newClient).toHaveLength(0);
    expect(result.inProgress).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// reconcileActions
// ---------------------------------------------------------------------------

describe("reconcileActions", () => {
  const emptySignals: Signals = { lapsedRepeat: [], newClient: [], inProgress: [] };

  it("returns empty plan when no signals and no existing actions", () => {
    const plan = reconcileActions(emptySignals, [], USER_ID, NOW);
    expect(plan).toEqual({ userId: USER_ID, toUpsert: [], toDelete: [] });
  });

  it("inserts upsert rows for signals with no matching existing action", () => {
    const signals: Signals = {
      lapsedRepeat: [{ clientId: "c1", revenueAtRiskMinor: 9000 }],
      newClient: [{ clientId: "c2", revenueAtRiskMinor: 5000 }],
      inProgress: [{ clientId: "c3", sessionId: "s3", revenueAtRiskMinor: 7000 }],
    };

    const plan = reconcileActions(signals, [], USER_ID, NOW);

    expect(plan.toUpsert).toEqual([
      {
        user_id: USER_ID,
        client_id: "c1",
        action_type: "lapsed_repeat",
        session_id: null,
        revenue_at_risk_minor: 9000,
        dismissed_at: null,
      },
      {
        user_id: USER_ID,
        client_id: "c2",
        action_type: "new_client",
        session_id: null,
        revenue_at_risk_minor: 5000,
        dismissed_at: null,
      },
      {
        user_id: USER_ID,
        client_id: "c3",
        action_type: "in_progress",
        session_id: "s3",
        revenue_at_risk_minor: 7000,
        dismissed_at: null,
      },
    ]);
    expect(plan.toDelete).toEqual([]);
  });

  it("skips signals whose existing action is active (not dismissed)", () => {
    const signals: Signals = {
      lapsedRepeat: [{ clientId: "c1", revenueAtRiskMinor: 9000 }],
      newClient: [],
      inProgress: [],
    };
    const existing = [
      makeAction({
        actionId: "a1",
        clientId: "c1",
        actionType: "lapsed_repeat",
        dismissedAt: null,
      }),
    ];

    const plan = reconcileActions(signals, existing, USER_ID, NOW);

    expect(plan.toUpsert).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });

  it("reactivates a signal whose existing action was dismissed long enough ago", () => {
    const signals: Signals = {
      lapsedRepeat: [{ clientId: "c1", revenueAtRiskMinor: 9000 }],
      newClient: [],
      inProgress: [],
    };
    const existing = [
      makeAction({
        actionId: "a1",
        clientId: "c1",
        actionType: "lapsed_repeat",
        dismissedAt: daysAgo(LAPSED_REPEAT_THRESHOLD_DAYS + 1),
      }),
    ];

    const plan = reconcileActions(signals, existing, USER_ID, NOW);

    expect(plan.toUpsert).toHaveLength(1);
    expect(plan.toUpsert[0].client_id).toBe("c1");
    expect(plan.toUpsert[0].action_type).toBe("lapsed_repeat");
  });

  it("respects the per-action-type dismissal threshold", () => {
    const signals: Signals = {
      lapsedRepeat: [],
      newClient: [{ clientId: "c2", revenueAtRiskMinor: 5000 }],
      inProgress: [],
    };
    // Just below new_client threshold — should be skipped.
    const existing = [
      makeAction({
        actionId: "a2",
        clientId: "c2",
        actionType: "new_client",
        dismissedAt: daysAgo(NEW_CLIENT_THRESHOLD_DAYS - 1),
      }),
    ];

    const plan = reconcileActions(signals, existing, USER_ID, NOW);
    expect(plan.toUpsert).toEqual([]);
  });

  it("deletes existing in_progress actions whose client is no longer in-progress", () => {
    const signals: Signals = {
      lapsedRepeat: [],
      newClient: [],
      inProgress: [{ clientId: "c-active", sessionId: "s-active", revenueAtRiskMinor: 7000 }],
    };
    const existing = [
      makeAction({
        actionId: "stale-1",
        clientId: "c-stale",
        actionType: "in_progress",
      }),
      makeAction({
        actionId: "stale-2",
        clientId: "c-stale-2",
        actionType: "in_progress",
        dismissedAt: daysAgo(5),
      }),
      makeAction({
        actionId: "active-existing",
        clientId: "c-active",
        actionType: "in_progress",
      }),
      // non in_progress actions should never be deleted
      makeAction({
        actionId: "lapsed",
        clientId: "c-lapsed",
        actionType: "lapsed_repeat",
      }),
    ];

    const plan = reconcileActions(signals, existing, USER_ID, NOW);

    expect(plan.toDelete.sort()).toEqual(["stale-1", "stale-2"].sort());
  });

  it("deletes all in_progress actions when no clients are in-progress", () => {
    const signals: Signals = {
      lapsedRepeat: [],
      newClient: [],
      inProgress: [],
    };
    const existing = [
      makeAction({ actionId: "ip-1", clientId: "c1", actionType: "in_progress" }),
      makeAction({ actionId: "ip-2", clientId: "c2", actionType: "in_progress" }),
    ];

    const plan = reconcileActions(signals, existing, USER_ID, NOW);

    expect(plan.toDelete.sort()).toEqual(["ip-1", "ip-2"].sort());
    expect(plan.toUpsert).toEqual([]);
  });

  it("includes the userId in the returned plan", () => {
    const plan = reconcileActions(emptySignals, [], "user-xyz", NOW);
    expect(plan.userId).toBe("user-xyz");
  });
});

// ---------------------------------------------------------------------------
// executeReconciliation
// ---------------------------------------------------------------------------

interface FakeSupabaseCalls {
  deleteEqUserId?: string;
  deleteInActionIds?: string[];
  upsertRows?: unknown;
  upsertOptions?: unknown;
  selectColumns?: string;
  fetchEqUserId?: string;
  fetchOrderColumn?: string;
  fetchOrderAsc?: boolean;
}

function makeFakeSupabase(opts: {
  deleteError?: unknown;
  upsertError?: unknown;
  fetchError?: unknown;
  fetchData?: unknown[];
}): { client: { from: jest.Mock }; calls: FakeSupabaseCalls } {
  const calls: FakeSupabaseCalls = {};

  const deleteBuilder = {
    eq: jest.fn(function (this: unknown, col: string, value: string) {
      if (col === "user_id") calls.deleteEqUserId = value;
      return this;
    }),
    in: jest.fn(async function (this: unknown, _col: string, ids: string[]) {
      calls.deleteInActionIds = ids;
      return { error: opts.deleteError ?? null };
    }),
  };

  const upsertResult = { error: opts.upsertError ?? null };
  const upsert = jest.fn(async (rows: unknown, options: unknown) => {
    calls.upsertRows = rows;
    calls.upsertOptions = options;
    return upsertResult;
  });

  const fetchBuilder = {
    eq: jest.fn(function (this: unknown, col: string, value: string) {
      if (col === "user_id") calls.fetchEqUserId = value;
      return this;
    }),
    is: jest.fn(function (this: unknown) {
      return this;
    }),
    order: jest.fn(async function (
      this: unknown,
      col: string,
      options: { ascending: boolean },
    ) {
      calls.fetchOrderColumn = col;
      calls.fetchOrderAsc = options.ascending;
      return { data: opts.fetchData ?? [], error: opts.fetchError ?? null };
    }),
  };

  const fromImpl = (table: string) => {
    if (table !== "client_actions") throw new Error(`unexpected table ${table}`);
    return {
      delete: () => deleteBuilder,
      upsert,
      select: jest.fn((columns: string) => {
        calls.selectColumns = columns;
        return fetchBuilder;
      }),
    };
  };

  const from = jest.fn(fromImpl);
  return { client: { from }, calls };
}

describe("executeReconciliation", () => {
  const baseRow = {
    action_id: "a1",
    client_id: "c1",
    action_type: "lapsed_repeat",
    session_id: null,
    revenue_at_risk_minor: 9000,
    clients: { name: "Alice" },
  };

  it("issues deletes, upserts, then fetch and returns rows in order", async () => {
    const plan: ReconciliationPlan = {
      userId: USER_ID,
      toUpsert: [
        {
          user_id: USER_ID,
          client_id: "c1",
          action_type: "lapsed_repeat",
          session_id: null,
          revenue_at_risk_minor: 9000,
          dismissed_at: null,
        },
      ],
      toDelete: ["stale-1", "stale-2"],
    };
    const { client, calls } = makeFakeSupabase({ fetchData: [baseRow] });

    const rows = await executeReconciliation(plan, client as never);

    expect(calls.deleteEqUserId).toBe(USER_ID);
    expect(calls.deleteInActionIds).toEqual(["stale-1", "stale-2"]);
    expect(calls.upsertRows).toEqual(plan.toUpsert);
    expect(calls.upsertOptions).toEqual({ onConflict: "user_id,client_id,action_type" });
    expect(calls.fetchEqUserId).toBe(USER_ID);
    expect(calls.fetchOrderColumn).toBe("revenue_at_risk_minor");
    expect(calls.fetchOrderAsc).toBe(false);
    expect(rows).toEqual([baseRow]);
  });

  it("skips delete and upsert when plan has nothing to write", async () => {
    const plan: ReconciliationPlan = { userId: USER_ID, toUpsert: [], toDelete: [] };
    const { client, calls } = makeFakeSupabase({ fetchData: [] });

    const rows = await executeReconciliation(plan, client as never);

    expect(calls.deleteInActionIds).toBeUndefined();
    expect(calls.upsertRows).toBeUndefined();
    expect(rows).toEqual([]);
  });

  it("throws ACTIONS_UPSERT_FAILED when delete errors", async () => {
    const plan: ReconciliationPlan = {
      userId: USER_ID,
      toUpsert: [],
      toDelete: ["bad"],
    };
    const { client } = makeFakeSupabase({ deleteError: new Error("boom") });
    await expect(executeReconciliation(plan, client as never)).rejects.toThrow(
      "ACTIONS_UPSERT_FAILED",
    );
  });

  it("throws ACTIONS_UPSERT_FAILED when upsert errors", async () => {
    const plan: ReconciliationPlan = {
      userId: USER_ID,
      toUpsert: [
        {
          user_id: USER_ID,
          client_id: "c1",
          action_type: "lapsed_repeat",
          session_id: null,
          revenue_at_risk_minor: 9000,
          dismissed_at: null,
        },
      ],
      toDelete: [],
    };
    const { client } = makeFakeSupabase({ upsertError: new Error("boom") });
    await expect(executeReconciliation(plan, client as never)).rejects.toThrow(
      "ACTIONS_UPSERT_FAILED",
    );
  });

  it("throws ACTIONS_FETCH_FAILED when active fetch errors", async () => {
    const plan: ReconciliationPlan = { userId: USER_ID, toUpsert: [], toDelete: [] };
    const { client } = makeFakeSupabase({ fetchError: new Error("boom") });
    await expect(executeReconciliation(plan, client as never)).rejects.toThrow(
      "ACTIONS_FETCH_FAILED",
    );
  });

  it("uses the in_progress session id when included in upsert", async () => {
    const plan: ReconciliationPlan = {
      userId: USER_ID,
      toUpsert: [
        {
          user_id: USER_ID,
          client_id: "c-ip",
          action_type: "in_progress",
          session_id: "session-xyz",
          revenue_at_risk_minor: 7000,
          dismissed_at: null,
        },
      ],
      toDelete: [],
    };
    const { client, calls } = makeFakeSupabase({ fetchData: [] });

    await executeReconciliation(plan, client as never);

    expect(calls.upsertRows).toEqual([
      expect.objectContaining({ action_type: "in_progress", session_id: "session-xyz" }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// Threshold sanity check (consumed by reconcileActions)
// ---------------------------------------------------------------------------

describe("reconcileActions threshold integration", () => {
  it("uses IN_PROGRESS_THRESHOLD_DAYS for in_progress dismissal cooldown", () => {
    const signals: Signals = {
      lapsedRepeat: [],
      newClient: [],
      inProgress: [{ clientId: "c-ip", sessionId: "s-ip", revenueAtRiskMinor: 7000 }],
    };
    const existing = [
      makeAction({
        actionId: "ip-existing",
        clientId: "c-ip",
        actionType: "in_progress",
        dismissedAt: daysAgo(IN_PROGRESS_THRESHOLD_DAYS - 1),
      }),
    ];
    const plan = reconcileActions(signals, existing, USER_ID, NOW);
    // existing in_progress whose client IS in active list and dismissed too
    // recently → not upserted, also not deleted (client is still active).
    expect(plan.toUpsert).toEqual([]);
    expect(plan.toDelete).toEqual([]);
  });
});
