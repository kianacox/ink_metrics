export type SessionSortField = "date" | "duration" | "profit";
export type SessionSortDirection = "asc" | "desc";

export interface SessionListItem {
  id: string;
  clientName: string;
  priceMinor: number;
  durationMinutes: number;
  createdAt: string;
}

export interface SessionSortState {
  field: SessionSortField;
  direction: SessionSortDirection;
}

const DEFAULT_SORT_STATE: SessionSortState = {
  field: "date",
  direction: "desc",
};

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterSessionsByClientName(
  sessions: SessionListItem[],
  query: string,
): SessionListItem[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return sessions;
  }

  return sessions.filter((session) =>
    session.clientName.toLowerCase().includes(normalizedQuery),
  );
}

function normalizeSortState(
  sortState: Partial<SessionSortState> | undefined,
): SessionSortState {
  const field = sortState?.field;
  const direction = sortState?.direction;

  const normalizedField: SessionSortField =
    field === "date" || field === "duration" || field === "profit"
      ? field
      : DEFAULT_SORT_STATE.field;
  const normalizedDirection: SessionSortDirection =
    direction === "asc" || direction === "desc"
      ? direction
      : DEFAULT_SORT_STATE.direction;

  return { field: normalizedField, direction: normalizedDirection };
}

function getSessionSortValue(
  session: SessionListItem,
  field: SessionSortField,
): number {
  if (field === "duration") {
    return session.durationMinutes;
  }

  if (field === "profit") {
    return session.priceMinor;
  }

  const timestamp = Date.parse(session.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
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

      if (valueA === valueB) {
        // Keep deterministic order when compared values match.
        return a.index - b.index;
      }

      return (valueA - valueB) * directionFactor;
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
