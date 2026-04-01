import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionDateRangePreset = "last30Days" | "last90Days" | "yearToDate" | "allTime";

export interface FetchSessionsPageParams {
  supabase: SupabaseClient;
  userId: string;
  searchQuery: string;
  sortField: SessionSortField;
  pageIndex: number;
  pageSize: number;
  dateRange: SessionDateRangePreset;
}

export interface FetchSessionsPageResult {
  rows: SessionRow[];
  hasNextPage: boolean;
}

const SORT_FIELD_TO_COLUMN: Record<SessionSortField, string> = {
  date: "created_at",
  duration: "session_duration",
  profit: "price",
};

function escapeLikePattern(query: string): string {
  return query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function getDateRangeStart(preset: SessionDateRangePreset): string | null {
  const now = new Date();

  if (preset === "allTime") {
    return null;
  }

  if (preset === "yearToDate") {
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }

  const daysBack = preset === "last30Days" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - daysBack);
  return start.toISOString();
}

export async function fetchSessionsPage({
  supabase,
  userId,
  searchQuery,
  sortField,
  pageIndex,
  pageSize,
  dateRange,
}: FetchSessionsPageParams): Promise<FetchSessionsPageResult> {
  const sortColumn = SORT_FIELD_TO_COLUMN[sortField];
  const normalizedQuery = searchQuery.trim();
  const rangeStart = pageIndex * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  let query = supabase
    .from("sessions")
    .select("session_id,price,session_duration,created_at,clients!inner(name)")
    .eq("user_id", userId)
    .order(sortColumn, { ascending: false })
    .order("session_id", { ascending: false });

  const dateRangeStart = getDateRangeStart(dateRange);
  if (dateRangeStart) {
    query = query.gte("created_at", dateRangeStart);
  }

  if (normalizedQuery.length > 0) {
    query = query.ilike("clients.name", `%${escapeLikePattern(normalizedQuery)}%`);
  }

  const { data, error } = await query.range(rangeStart, rangeEnd + 1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as SessionRow[]).slice(0, pageSize);
  return {
    rows,
    hasNextPage: (data ?? []).length > pageSize,
  };
}
