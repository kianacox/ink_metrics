import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDateRangeStartUtcIso } from "@/lib/timezones";
import type {
  FetchSessionsPageParams,
  FetchSessionsPageResult,
} from "@/lib/sessions/models";

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

export async function fetchSessionsPage({
  supabase,
  userId,
  reportingTimezone,
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
      "session_id,price,session_duration,session_at,through_ads,created_at,compensation_version_id,clients!inner(name),artist_compensation_versions!sessions_compensation_version_id_fkey(compensation_version_id,pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor)",
    )
    .eq("user_id", userId)
    .order(sortColumn, { ascending: false })
    .order("session_id", { ascending: false });

  let totalCountQuery = supabase
    .from("sessions")
    .select("session_id,clients!inner(name)", { count: "exact", head: true })
    .eq("user_id", userId);

  if (dateRangeStart) {
    rowsQuery = rowsQuery.gte("session_at", dateRangeStart);
    totalCountQuery = totalCountQuery.gte("session_at", dateRangeStart);
  }

  if (normalizedQuery.length > 0) {
    const escapedQuery = `%${escapeLikePattern(normalizedQuery)}%`;
    rowsQuery = rowsQuery.ilike("clients.name", escapedQuery);
    totalCountQuery = totalCountQuery.ilike("clients.name", escapedQuery);
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    rowsQuery.range(rangeStart, rangeEnd + 1),
    totalCountQuery,
  ]);

  if (error || countError) {
    throw new Error(error?.message ?? countError?.message ?? "Could not load sessions.");
  }

  const pageRows = ((data ?? []) as SessionRow[]).slice(0, pageSize);
  const rows = await hydrateMissingCompensationVersions({
    supabase,
    userId,
    rows: pageRows,
  });
  return {
    rows,
    hasNextPage: (data ?? []).length > pageSize,
    totalCount: count ?? 0,
  };
}
