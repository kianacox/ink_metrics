import type {
  ClientAction,
  InProgressSignal,
  LapsedRepeatSignal,
  NewClientSignal,
  SessionRow,
} from "@/lib/actions/models";

const DAYS_MS = 24 * 60 * 60 * 1000;

export const LAPSED_REPEAT_THRESHOLD_DAYS = 56;
export const NEW_CLIENT_THRESHOLD_DAYS = 42;
export const IN_PROGRESS_THRESHOLD_DAYS = 28;

function daysSince(isoTimestamp: string, now: Date): number {
  return (now.getTime() - new Date(isoTimestamp).getTime()) / DAYS_MS;
}

export function computeLapsedRepeatSignals(
  sessions: SessionRow[],
  now: Date = new Date(),
): LapsedRepeatSignal[] {
  const byClient = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const group = byClient.get(s.clientId) ?? [];
    group.push(s);
    byClient.set(s.clientId, group);
  }

  const signals: LapsedRepeatSignal[] = [];
  for (const [clientId, clientSessions] of byClient) {
    if (clientSessions.length < 2) continue;
    const mostRecent = clientSessions.reduce((a, b) =>
      a.sessionAt > b.sessionAt ? a : b,
    );
    if (daysSince(mostRecent.sessionAt, now) < LAPSED_REPEAT_THRESHOLD_DAYS) continue;

    const avgPrice = Math.round(
      clientSessions.reduce((sum, s) => sum + s.priceMinor, 0) / clientSessions.length,
    );
    signals.push({ clientId, revenueAtRiskMinor: avgPrice });
  }
  return signals;
}

export function computeNewClientSignals(
  sessions: SessionRow[],
  now: Date = new Date(),
): NewClientSignal[] {
  const byClient = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const group = byClient.get(s.clientId) ?? [];
    group.push(s);
    byClient.set(s.clientId, group);
  }

  const signals: NewClientSignal[] = [];
  for (const [clientId, clientSessions] of byClient) {
    if (clientSessions.length !== 1) continue;
    const session = clientSessions[0];
    if (daysSince(session.sessionAt, now) < NEW_CLIENT_THRESHOLD_DAYS) continue;
    signals.push({ clientId, revenueAtRiskMinor: session.priceMinor });
  }
  return signals;
}

export function computeInProgressSignals(
  sessions: SessionRow[],
  now: Date = new Date(),
): InProgressSignal[] {
  const byClient = new Map<string, SessionRow>();
  for (const s of sessions) {
    const current = byClient.get(s.clientId);
    if (!current || s.sessionAt > current.sessionAt) {
      byClient.set(s.clientId, s);
    }
  }

  const signals: InProgressSignal[] = [];
  for (const [clientId, mostRecent] of byClient) {
    if (!mostRecent.inProgress) continue;
    if (daysSince(mostRecent.sessionAt, now) < IN_PROGRESS_THRESHOLD_DAYS) continue;
    signals.push({
      clientId,
      sessionId: mostRecent.sessionId,
      revenueAtRiskMinor: mostRecent.priceMinor,
    });
  }
  return signals;
}

export type UpsertOperation = "insert" | "reactivate" | "skip";

export function resolveUpsertOperation(
  existingAction: ClientAction | null,
  thresholdDays: number,
  now: Date = new Date(),
): UpsertOperation {
  if (!existingAction) return "insert";
  if (!existingAction.dismissedAt) return "skip";

  const daysSinceDismissal =
    (now.getTime() - new Date(existingAction.dismissedAt).getTime()) / DAYS_MS;
  return daysSinceDismissal >= thresholdDays ? "reactivate" : "skip";
}
