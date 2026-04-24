export type SessionSortField = "date" | "profit";
export type SessionSortDirection = "asc" | "desc";

export interface SessionListItem {
  id: string;
  clientName: string;
  priceMinor: number;
  sessionDate: string;   // "YYYY-MM-DD" calendar date of the session
  createdAt: string;     // server timestamp; used only as a tiebreaker for same-day sort
  throughAds: boolean;
  inProgress: boolean;
  isLatestForClient: boolean;
}

export interface SessionSortState {
  field: SessionSortField;
  direction: SessionSortDirection;
}

const DEFAULT_SORT_STATE: SessionSortState = { field: "date", direction: "desc" };

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterSessionsByClientName(
  sessions: SessionListItem[],
  query: string,
): SessionListItem[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return sessions;
  return sessions.filter((session) =>
    session.clientName.toLowerCase().includes(normalizedQuery),
  );
}

function normalizeSortState(sortState: Partial<SessionSortState> | undefined): SessionSortState {
  const field = sortState?.field;
  const direction = sortState?.direction;
  const normalizedField: SessionSortField = field === "date" || field === "profit" ? field : DEFAULT_SORT_STATE.field;
  const normalizedDirection: SessionSortDirection = direction === "asc" || direction === "desc" ? direction : DEFAULT_SORT_STATE.direction;
  return { field: normalizedField, direction: normalizedDirection };
}

function getSessionSortValue(session: SessionListItem, field: SessionSortField): number {
  if (field === "profit") return session.priceMinor;
  // Parse "YYYY-MM-DD" as UTC midnight for numeric comparison
  return Date.parse(session.sessionDate + "T00:00:00Z");
}

export function sortSessions(
  sessions: SessionListItem[],
  sortState?: Partial<SessionSortState>,
): SessionListItem[] {
  const normalizedSortState = normalizeSortState(sortState);
  const directionFactor = normalizedSortState.direction === "asc" ? 1 : -1;

  return sessions
    .map((session, index) => ({ session, index }))
    .sort((a, b) => {
      const valueA = getSessionSortValue(a.session, normalizedSortState.field);
      const valueB = getSessionSortValue(b.session, normalizedSortState.field);

      if (valueA !== valueB) {
        return (valueA - valueB) * directionFactor;
      }

      // Same-day tiebreaker: most recently logged first (created_at desc), always
      const createdA = Date.parse(a.session.createdAt);
      const createdB = Date.parse(b.session.createdAt);
      if (Number.isFinite(createdA) && Number.isFinite(createdB) && createdA !== createdB) {
        return createdB - createdA;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.session);
}

export function getVisibleSessions(
  sessions: SessionListItem[],
  query: string,
  sortState?: Partial<SessionSortState>,
): SessionListItem[] {
  const filtered = filterSessionsByClientName(sessions, query);
  return sortSessions(filtered, sortState);
}
