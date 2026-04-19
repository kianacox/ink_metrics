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
import type { ActionType, ClientAction, SessionRow } from "@/lib/actions/models";

export interface ActionResponse {
  actionId: string;
  clientId: string;
  clientName: string;
  actionType: ActionType;
  weeksSince: number;
  revenueAtRiskMinor: number;
  messageTemplate: string;
}

interface UpsertRow {
  user_id: string;
  client_id: string;
  action_type: ActionType;
  session_id: string | null;
  revenue_at_risk_minor: number;
  dismissed_at: null;
}

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

export async function computeAndUpsertActions(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ActionResponse[]> {
  // 1. Load all sessions for the authenticated user.
  const { data: rawSessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("session_id, client_id, price, session_at, in_progress")
    .eq("user_id", userId);

  if (sessionsError) throw new Error("ACTIONS_UPSERT_FAILED");

  const sessions = toSessionRows(rawSessions ?? []);

  // 2. Compute all three signal sets.
  const lapsedSignals = computeLapsedRepeatSignals(sessions, now);
  const newClientSignals = computeNewClientSignals(sessions, now);
  const inProgressSignals = computeInProgressSignals(sessions, now);

  // 3. Load existing client_actions for the user.
  const { data: rawActions, error: actionsError } = await supabase
    .from("client_actions")
    .select("*")
    .eq("user_id", userId);

  if (actionsError) throw new Error("ACTIONS_UPSERT_FAILED");

  const existingByKey = new Map<string, ClientAction>();
  for (const a of rawActions ?? []) {
    existingByKey.set(`${a.client_id}:${a.action_type}`, toClientAction(a));
  }

  // 4. Delete stale in_progress actions (§6.2): clients not in current signal set.
  const inProgressClientIds = inProgressSignals.map((s) => s.clientId);
  if (inProgressClientIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("client_actions")
      .delete()
      .eq("user_id", userId)
      .eq("action_type", "in_progress")
      .not("client_id", "in", `(${inProgressClientIds.join(",")})`);
    if (deleteError) throw new Error("ACTIONS_UPSERT_FAILED");
  } else {
    const { error: deleteError } = await supabase
      .from("client_actions")
      .delete()
      .eq("user_id", userId)
      .eq("action_type", "in_progress");
    if (deleteError) throw new Error("ACTIONS_UPSERT_FAILED");
  }

  // 5. Collect upserts for signals that need inserting or reactivating.
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

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from("client_actions")
      .upsert(upserts, { onConflict: "user_id,client_id,action_type" });
    if (upsertError) throw new Error("ACTIONS_UPSERT_FAILED");
  }

  // 6. Fetch all active actions with client names.
  const { data: activeRaw, error: fetchError } = await supabase
    .from("client_actions")
    .select("action_id, client_id, action_type, session_id, revenue_at_risk_minor, clients(name)")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("revenue_at_risk_minor", { ascending: false });

  if (fetchError) throw new Error("ACTIONS_FETCH_FAILED");

  // Build session lookup maps for weeksSince computation.
  const mostRecentByClient = new Map<string, string>();
  const sessionAtById = new Map<string, string>();
  for (const s of sessions) {
    sessionAtById.set(s.sessionId, s.sessionAt);
    const current = mostRecentByClient.get(s.clientId);
    if (!current || s.sessionAt > current) {
      mostRecentByClient.set(s.clientId, s.sessionAt);
    }
  }

  return (activeRaw ?? []).map((row) => {
    const actionType = row.action_type as ActionType;
    const clientsJoin = row.clients as { name: string } | { name: string }[] | null;
    const clientName =
      (Array.isArray(clientsJoin) ? clientsJoin[0] : clientsJoin)?.name ?? "Client";
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
  });
}
