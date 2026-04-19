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

function daysSince(isoTimestamp: string, now: Date): number {
  return (now.getTime() - new Date(isoTimestamp).getTime()) / DAYS_MS;
}

function toSessionRows(rawSessions: Array<Record<string, unknown>>): SessionRow[] {
  return rawSessions.map((s) => ({
    sessionId: s.session_id as string,
    clientId: s.client_id as string,
    priceMinor: typeof s.price === "number" ? s.price : 0,
    sessionAt: s.session_at as string,
    inProgress: typeof s.in_progress === "boolean" ? s.in_progress : false,
  }));
}

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

async function loadUserSessions(supabase: SupabaseClient, userId: string): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("session_id, client_id, price, session_at, in_progress")
    .eq("user_id", userId);

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
  return toSessionRows(data ?? []);
}

async function loadExistingActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, ClientAction>> {
  const { data, error } = await supabase
    .from("client_actions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");

  const byKey = new Map<string, ClientAction>();
  for (const a of data ?? []) {
    byKey.set(`${a.client_id}:${a.action_type}`, toClientAction(a));
  }
  return byKey;
}

async function deleteStaleInProgressActions(
  supabase: SupabaseClient,
  userId: string,
  activeClientIds: string[],
): Promise<void> {
  let query = supabase
    .from("client_actions")
    .delete()
    .eq("user_id", userId)
    .eq("action_type", "in_progress");

  if (activeClientIds.length > 0) {
    query = query.not("client_id", "in", `(${activeClientIds.join(",")})`);
  }

  const { error } = await query;
  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
}

function collectUpserts(
  userId: string,
  lapsedSignals: LapsedRepeatSignal[],
  newClientSignals: NewClientSignal[],
  inProgressSignals: InProgressSignal[],
  existingByKey: Map<string, ClientAction>,
  now: Date,
): UpsertRow[] {
  const upserts: UpsertRow[] = [];

  for (const signal of lapsedSignals) {
    const existing = existingByKey.get(`${signal.clientId}:lapsed_repeat`) ?? null;
    const op = resolveUpsertOperation(existing, LAPSED_REPEAT_THRESHOLD_DAYS, now);
    if (op === "insert" || op === "reactivate") {
      upserts.push({
        user_id: userId,
        client_id: signal.clientId,
        action_type: "lapsed_repeat",
        session_id: null,
        revenue_at_risk_minor: signal.revenueAtRiskMinor,
        dismissed_at: null,
      });
    }
  }

  for (const signal of newClientSignals) {
    const existing = existingByKey.get(`${signal.clientId}:new_client`) ?? null;
    const op = resolveUpsertOperation(existing, NEW_CLIENT_THRESHOLD_DAYS, now);
    if (op === "insert" || op === "reactivate") {
      upserts.push({
        user_id: userId,
        client_id: signal.clientId,
        action_type: "new_client",
        session_id: null,
        revenue_at_risk_minor: signal.revenueAtRiskMinor,
        dismissed_at: null,
      });
    }
  }

  for (const signal of inProgressSignals) {
    const existing = existingByKey.get(`${signal.clientId}:in_progress`) ?? null;
    const op = resolveUpsertOperation(existing, IN_PROGRESS_THRESHOLD_DAYS, now);
    if (op === "insert" || op === "reactivate") {
      upserts.push({
        user_id: userId,
        client_id: signal.clientId,
        action_type: "in_progress",
        session_id: signal.sessionId,
        revenue_at_risk_minor: signal.revenueAtRiskMinor,
        dismissed_at: null,
      });
    }
  }

  return upserts;
}

async function executeUpserts(supabase: SupabaseClient, upserts: UpsertRow[]): Promise<void> {
  if (upserts.length === 0) return;

  const { error } = await supabase
    .from("client_actions")
    .upsert(upserts, { onConflict: "user_id,client_id,action_type" });

  if (error) throw new Error("ACTIONS_UPSERT_FAILED");
}

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

export async function computeAndUpsertActions(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ActionResponse[]> {
  const sessions = await loadUserSessions(supabase, userId);

  const lapsedSignals = computeLapsedRepeatSignals(sessions, now);
  const newClientSignals = computeNewClientSignals(sessions, now);
  const inProgressSignals = computeInProgressSignals(sessions, now);

  const existingByKey = await loadExistingActions(supabase, userId);

  await deleteStaleInProgressActions(
    supabase,
    userId,
    inProgressSignals.map((s) => s.clientId),
  );

  const upserts = collectUpserts(
    userId,
    lapsedSignals,
    newClientSignals,
    inProgressSignals,
    existingByKey,
    now,
  );
  await executeUpserts(supabase, upserts);

  const activeRaw = await fetchActiveActionRows(supabase, userId);
  const { mostRecentByClient, sessionAtById } = buildSessionLookups(sessions);

  return activeRaw.map((row) => serializeActionRow(row, sessionAtById, mostRecentByClient, now));
}
