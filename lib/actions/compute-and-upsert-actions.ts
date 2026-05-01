import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeInProgressSignals,
  computeLapsedRepeatSignals,
  computeNewClientSignals,
  IN_PROGRESS_THRESHOLD_DAYS,
  LAPSED_REPEAT_THRESHOLD_DAYS,
  NEW_CLIENT_THRESHOLD_DAYS,
  resolveUpsertOperation,
} from "@/lib/actions/signal-queries";
import { resolveMessageTemplate } from "@/lib/actions/template-resolver";
import type {
  ActionResponse,
  ActionType,
  ClientAction,
  InProgressSignal,
  LapsedRepeatSignal,
  NewClientSignal,
  SessionRow,
  UpsertRow,
} from "@/lib/actions/models";

const DAYS_MS = 24 * 60 * 60 * 1000;

/** Aggregated signals from a single sweep over the user's sessions. */
export interface Signals {
  lapsedRepeat: LapsedRepeatSignal[];
  newClient: NewClientSignal[];
  inProgress: InProgressSignal[];
}

/**
 * The diff between computed signals and existing client_actions rows.
 * `toUpsert` contains rows ready for `client_actions` upsert (already filtered
 * for dismissal-cooldown skips). `toDelete` contains action_ids of in_progress
 * actions whose client is no longer flagged as in-progress and must be removed.
 */
export interface ReconciliationPlan {
  userId: string;
  toUpsert: UpsertRow[];
  toDelete: string[];
}

/** Returns the number of fractional days elapsed since the given ISO timestamp. */
function daysSince(isoTimestamp: string, now: Date): number {
  return (now.getTime() - new Date(isoTimestamp).getTime()) / DAYS_MS;
}

/** Maps raw Supabase session rows to typed SessionRow objects. */
function toSessionRows(rawSessions: Array<Record<string, unknown>>): SessionRow[] {
  return rawSessions.map((s) => ({
    sessionId: s.session_id as string,
    clientId: s.client_id as string,
    priceMinor: typeof s.price === "number" ? s.price : 0,
    sessionAt: s.session_at as string,
    inProgress: typeof s.in_progress === "boolean" ? s.in_progress : false,
  }));
}

/** Maps a raw Supabase client_actions row to a typed ClientAction. */
function toClientAction(a: Record<string, unknown>): ClientAction {
  return {
    actionId: a.action_id as string,
    userId: a.user_id as string,
    clientId: a.client_id as string,
    actionType: a.action_type as ActionType,
    sessionId: typeof a.session_id === "string" ? a.session_id : null,
    revenueAtRiskMinor: typeof a.revenue_at_risk_minor === "number" ? a.revenue_at_risk_minor : null,
    dismissedAt: typeof a.dismissed_at === "string" ? a.dismissed_at : null,
    createdAt: a.created_at as string,
  };
}

/** Fetches all sessions for a user, scoped by userId. */
async function loadUserSessions(supabase: SupabaseClient, userId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("session_id, client_id, price, session_at, in_progress")
    .eq("user_id", userId);

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
  return toSessionRows(data ?? []);
}

/** Loads all existing client_actions for a user. */
async function loadExistingActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClientAction[]> {
  const { data, error } = await supabase
    .from("client_actions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
  return (data ?? []).map(toClientAction);
}

/** Indexes existing actions by "clientId:actionType" for O(1) lookup during reconcile. */
function indexActionsByKey(actions: ClientAction[]): Map<string, ClientAction> {
  const byKey = new Map<string, ClientAction>();
  for (const a of actions) {
    byKey.set(`${a.clientId}:${a.actionType}`, a);
  }
  return byKey;
}

/** Deletes the given action_ids from client_actions for the user. */
async function deleteActionsByIds(
  supabase: SupabaseClient,
  userId: string,
  actionIds: string[],
): Promise<void> {
  if (actionIds.length === 0) return;

  const { error } = await supabase
    .from("client_actions")
    .delete()
    .eq("user_id", userId)
    .in("action_id", actionIds);

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
}

/** Upserts action rows, resolving conflicts on (user_id, client_id, action_type). */
async function executeUpserts(supabase: SupabaseClient, upserts: UpsertRow[]): Promise<void> {
  if (upserts.length === 0) return;

  const { error } = await supabase
    .from("client_actions")
    .upsert(upserts, { onConflict: "user_id,client_id,action_type" });

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
}

/** Fetches non-dismissed action rows for the user, ordered by revenue_at_risk_minor descending. */
async function fetchActiveActionRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("client_actions")
    .select("action_id, client_id, action_type, session_id, revenue_at_risk_minor, clients(name)")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("revenue_at_risk_minor", { ascending: false });

  if (error) throw new Error("ACTIONS_FETCH_FAILED");
  return (data ?? []) as Array<Record<string, unknown>>;
}

/** Builds lookup maps for most-recent session timestamps, used to compute weeksSince. */
function buildSessionLookups(sessions: SessionRow[]): {
  mostRecentByClient: Map<string, string>;
  sessionAtById: Map<string, string>;
} {
  const mostRecentByClient = new Map<string, string>();
  const sessionAtById = new Map<string, string>();

  for (const s of sessions) {
    sessionAtById.set(s.sessionId, s.sessionAt);
    const current = mostRecentByClient.get(s.clientId);
    if (!current || s.sessionAt > current) {
      mostRecentByClient.set(s.clientId, s.sessionAt);
    }
  }

  return { mostRecentByClient, sessionAtById };
}

/** Converts a raw action row from Supabase into the ActionResponse shape for the API. */
function serializeActionRow(
  row: Record<string, unknown>,
  sessionAtById: Map<string, string>,
  mostRecentByClient: Map<string, string>,
  now: Date,
): ActionResponse {
  const actionType = row.action_type as ActionType;
  const clientsJoin = row.clients as { name: string } | { name: string }[] | null;
  const clientName = (Array.isArray(clientsJoin) ? clientsJoin[0] : clientsJoin)?.name ?? "Client";
  const revenueAtRiskMinor =
    typeof row.revenue_at_risk_minor === "number" ? row.revenue_at_risk_minor : 0;

  let sessionAt: string | null = null;
  if (actionType === "in_progress" && row.session_id) {
    sessionAt = sessionAtById.get(row.session_id as string) ?? null;
  }
  if (!sessionAt) {
    sessionAt = mostRecentByClient.get(row.client_id as string) ?? null;
  }

  const weeks = sessionAt ? Math.floor(daysSince(sessionAt, now) / 7) : 0;

  return {
    actionId: row.action_id as string,
    clientId: row.client_id as string,
    clientName,
    actionType,
    weeksSince: weeks,
    revenueAtRiskMinor,
    messageTemplate: resolveMessageTemplate(actionType, clientName),
  };
}

// ---------------------------------------------------------------------------
// Phase 1: Pure signal computation
// ---------------------------------------------------------------------------

/**
 * Pure computation: derives the three signal types (lapsed_repeat, new_client,
 * in_progress) from the user's raw session data. No DB access.
 */
export function computeSignals(sessions: SessionRow[], now: Date = new Date()): Signals {
  return {
    lapsedRepeat: computeLapsedRepeatSignals(sessions, now),
    newClient: computeNewClientSignals(sessions, now),
    inProgress: computeInProgressSignals(sessions, now),
  };
}

// ---------------------------------------------------------------------------
// Phase 2: Pure reconciliation between signals and existing DB state
// ---------------------------------------------------------------------------

/**
 * Pure diff: produces the list of upserts to apply and action_ids to delete
 * given the freshly-computed signals and the user's current client_actions.
 *
 * - `toUpsert` includes signals whose existing action is absent or past its
 *   dismissal-cooldown window (per `resolveUpsertOperation`).
 * - `toDelete` includes existing `in_progress` actions whose client is no
 *   longer flagged as in-progress, preserving the prior delete-by-exclusion
 *   semantics.
 */
export function reconcileActions(
  signals: Signals,
  existing: ClientAction[],
  userId: string,
  now: Date = new Date(),
): ReconciliationPlan {
  const existingByKey = indexActionsByKey(existing);
  const toUpsert: UpsertRow[] = [];

  for (const signal of signals.lapsedRepeat) {
    const existingAction = existingByKey.get(`${signal.clientId}:lapsed_repeat`) ?? null;
    const op = resolveUpsertOperation(existingAction, LAPSED_REPEAT_THRESHOLD_DAYS, now);
    if (op === "insert" || op === "reactivate") {
      toUpsert.push({
        user_id: userId,
        client_id: signal.clientId,
        action_type: "lapsed_repeat",
        session_id: null,
        revenue_at_risk_minor: signal.revenueAtRiskMinor,
        dismissed_at: null,
      });
    }
  }

  for (const signal of signals.newClient) {
    const existingAction = existingByKey.get(`${signal.clientId}:new_client`) ?? null;
    const op = resolveUpsertOperation(existingAction, NEW_CLIENT_THRESHOLD_DAYS, now);
    if (op === "insert" || op === "reactivate") {
      toUpsert.push({
        user_id: userId,
        client_id: signal.clientId,
        action_type: "new_client",
        session_id: null,
        revenue_at_risk_minor: signal.revenueAtRiskMinor,
        dismissed_at: null,
      });
    }
  }

  for (const signal of signals.inProgress) {
    const existingAction = existingByKey.get(`${signal.clientId}:in_progress`) ?? null;
    const op = resolveUpsertOperation(existingAction, IN_PROGRESS_THRESHOLD_DAYS, now);
    if (op === "insert" || op === "reactivate") {
      toUpsert.push({
        user_id: userId,
        client_id: signal.clientId,
        action_type: "in_progress",
        session_id: signal.sessionId,
        revenue_at_risk_minor: signal.revenueAtRiskMinor,
        dismissed_at: null,
      });
    }
  }

  const activeInProgressClients = new Set(signals.inProgress.map((s) => s.clientId));
  const toDelete: string[] = [];
  for (const action of existing) {
    if (action.actionType === "in_progress" && !activeInProgressClients.has(action.clientId)) {
      toDelete.push(action.actionId);
    }
  }

  return { userId, toUpsert, toDelete };
}

// ---------------------------------------------------------------------------
// Phase 3: DB execution of the reconciliation plan
// ---------------------------------------------------------------------------

/**
 * Applies the reconciliation plan to the database and returns the user's
 * active (non-dismissed) client_actions rows, ordered by revenue at risk.
 * Deletes are issued before upserts to avoid conflicting on the unique
 * (user_id, client_id, action_type) index.
 */
export async function executeReconciliation(
  plan: ReconciliationPlan,
  supabase: SupabaseClient,
): Promise<Array<Record<string, unknown>>> {
  await deleteActionsByIds(supabase, plan.userId, plan.toDelete);
  await executeUpserts(supabase, plan.toUpsert);
  return fetchActiveActionRows(supabase, plan.userId);
}

// ---------------------------------------------------------------------------
// Orchestrator (public API — unchanged)
// ---------------------------------------------------------------------------

/**
 * Computes action signals from the user's sessions, upserts them into client_actions,
 * and returns the active (non-dismissed) actions sorted by revenue at risk descending.
 */
export async function computeAndUpsertActions(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ActionResponse[]> {
  const sessions = await loadUserSessions(supabase, userId);
  const existing = await loadExistingActions(supabase, userId);

  const signals = computeSignals(sessions, now);
  const plan = reconcileActions(signals, existing, userId, now);
  const activeRaw = await executeReconciliation(plan, supabase);

  const { mostRecentByClient, sessionAtById } = buildSessionLookups(sessions);
  return activeRaw.map((row) => serializeActionRow(row, sessionAtById, mostRecentByClient, now));
}
