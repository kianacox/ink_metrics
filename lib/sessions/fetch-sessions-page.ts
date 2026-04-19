import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDateRangeStartUtcIso } from "@/lib/timezones";
import type {
  FetchSessionsPageParams,
  FetchSessionsPageResult,
} from "@/lib/sessions/models";
import { encodeCompositeCursor } from "@/lib/pagination/cursor";

const SORT_FIELD_TO_COLUMN: Record<SessionSortField, string> = {
  date: "session_at",
  duration: "session_duration",
  profit: "price",
};

function escapeLikePattern(query: string): string {
  return query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function hydrateMissingCompensationVersions({
  supabase,
  userId,
  rows,
}: {
  supabase: SupabaseClient;
  userId: string;
  rows: SessionRow[];
}): Promise<SessionRow[]> {
  type CompensationVersionRelation = Exclude<SessionRow["artist_compensation_versions"], null | undefined>;
  const rowsMissingCompensation = rows.filter(
    (row) =>
      row.compensation_version_id === null &&
      row.artist_compensation_versions === null &&
      typeof row.session_at === "string" &&
      row.session_at.length > 0,
  );

  if (rowsMissingCompensation.length === 0) {
    return rows;
  }

  const resolvedBySessionId = new Map<string, CompensationVersionRelation>();

  await Promise.all(
    rowsMissingCompensation.map(async (row) => {
      const { data: versionRows, error } = await supabase
        .from("artist_compensation_versions")
        .select(
          "compensation_version_id,pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor",
        )
        .eq("user_id", userId)
        .lte("effective_from", row.session_at)
        .or(`effective_to.is.null,effective_to.gt.${row.session_at}`)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (error || !versionRows?.[0]?.compensation_version_id) {
        return;
      }

      resolvedBySessionId.set(row.session_id, versionRows[0] as CompensationVersionRelation);
    }),
  );

  if (resolvedBySessionId.size === 0) {
    return rows;
  }

  return rows.map((row) => {
    const fallbackVersion = resolvedBySessionId.get(row.session_id);
    if (!fallbackVersion) {
      return row;
    }

    const fallbackSingleVersion = Array.isArray(fallbackVersion)
      ? fallbackVersion[0] ?? null
      : fallbackVersion;
    if (!fallbackSingleVersion?.compensation_version_id) {
      return row;
    }

    return {
      ...row,
      compensation_version_id: fallbackSingleVersion.compensation_version_id,
      artist_compensation_versions: fallbackSingleVersion,
    };
  });
}

function formatOrValue(value: string | number): string {
  if (typeof value === "number") {
    return String(value);
  }
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function getSortValueForCursor(row: SessionRow, sortField: SessionSortField): string | number {
  if (sortField === "duration") {
    return Number(row.session_duration ?? 0);
  }
  if (sortField === "profit") {
    return Number(row.price ?? 0);
  }
  return row.session_at ?? "";
}

export async function fetchSessionsPage({
  supabase,
  userId,
  reportingTimezone,
  searchQuery,
  sortField,
  cursor,
  limit,
  dateRange,
}: FetchSessionsPageParams): Promise<FetchSessionsPageResult> {
  const sortColumn = SORT_FIELD_TO_COLUMN[sortField];
  const normalizedQuery = searchQuery.trim();
  const dateRangeStart = getDateRangeStartUtcIso({
    preset: dateRange,
    timezone: reportingTimezone,
  });
  if (dateRange !== "allTime" && !dateRangeStart) {
    throw new Error("Could not compute date range boundaries.");
  }

  let rowsQuery = supabase
    .from("sessions")
    .select(
      "session_id,price,session_duration,session_at,through_ads,in_progress,created_at,compensation_version_id,clients!inner(name),artist_compensation_versions!sessions_compensation_version_id_fkey(compensation_version_id,pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor)",
    )
    .eq("user_id", userId)
    .order(sortColumn, { ascending: false })
    .order("session_id", { ascending: false })
    .limit(limit + 1);

  if (dateRangeStart) {
    rowsQuery = rowsQuery.gte("session_at", dateRangeStart);
  }

  if (normalizedQuery.length > 0) {
    const escapedQuery = `%${escapeLikePattern(normalizedQuery)}%`;
    rowsQuery = rowsQuery.ilike("clients.name", escapedQuery);
  }

  if (cursor) {
    const cursorSortValue = formatOrValue(cursor.sortValue);
    const cursorId = formatOrValue(cursor.id);
    rowsQuery = rowsQuery.or(
      `${sortColumn}.lt.${cursorSortValue},and(${sortColumn}.eq.${cursorSortValue},session_id.lt.${cursorId})`,
    );
  }

  const { data, error } = await rowsQuery;

  if (error) {
    throw new Error(error.message ?? "Could not load sessions.");
  }

  const rows = (data ?? []) as SessionRow[];
  const hasNextPage = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const hydratedRows = await hydrateMissingCompensationVersions({
    supabase,
    userId,
    rows: pageRows,
  });

  const lastRow = pageRows[pageRows.length - 1] ?? null;
  const nextCursor = hasNextPage && lastRow
    ? encodeCompositeCursor({
        sortValue: getSortValueForCursor(lastRow, sortField),
        id: lastRow.session_id,
      })
    : null;

  return {
    data: hydratedRows,
    hasNextPage,
    nextCursor,
  };
}
