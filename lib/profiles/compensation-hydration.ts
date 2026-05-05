import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionRow } from "@/lib/sessions/models";

type CompensationVersionRelation = Exclude<
  SessionRow["artist_compensation_versions"],
  null | undefined
>;

const COMPENSATION_VERSION_COLUMNS =
  "compensation_version_id,pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor";

interface HydrateMissingCompensationVersionsParams {
  supabase: SupabaseClient;
  userId: string;
  rows: SessionRow[];
}

/**
 * Fills in `compensation_version_id` and `artist_compensation_versions` for
 * session rows that lack them by looking up the compensation version that was
 * effective on the row's `session_at` date.
 *
 * This is a compensation-domain concern called by session fetch as an external
 * dependency.
 */
export async function hydrateMissingCompensationVersions({
  supabase,
  userId,
  rows,
}: HydrateMissingCompensationVersionsParams): Promise<SessionRow[]> {
  const rowsMissingCompensation = rows.filter(
    (row) =>
      row.compensation_version_id === null &&
      row.artist_compensation_versions === null &&
      typeof row.session_at === "string" &&
      row.session_at.length > 0,
  );

  if (rowsMissingCompensation.length === 0) return rows;

  const resolvedBySessionId = new Map<string, CompensationVersionRelation>();

  await Promise.all(
    rowsMissingCompensation.map(async (row) => {
      const { data: versionRows, error } = await supabase
        .from("artist_compensation_versions")
        .select(COMPENSATION_VERSION_COLUMNS)
        .eq("user_id", userId)
        .lte("effective_from", row.session_at)
        .or(`effective_to.is.null,effective_to.gt.${row.session_at}`)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (error || !versionRows?.[0]?.compensation_version_id) return;
      resolvedBySessionId.set(
        row.session_id,
        versionRows[0] as CompensationVersionRelation,
      );
    }),
  );

  if (resolvedBySessionId.size === 0) return rows;

  return rows.map((row) => {
    const fallbackVersion = resolvedBySessionId.get(row.session_id);
    if (!fallbackVersion) return row;
    const fallbackSingleVersion = Array.isArray(fallbackVersion)
      ? fallbackVersion[0] ?? null
      : fallbackVersion;
    if (!fallbackSingleVersion?.compensation_version_id) return row;
    return {
      ...row,
      compensation_version_id: fallbackSingleVersion.compensation_version_id,
      artist_compensation_versions: fallbackSingleVersion,
    };
  });
}
