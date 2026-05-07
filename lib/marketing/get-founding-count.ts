import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Maximum number of founding-member spots available. Once the count of
 * profiles flagged as founding users reaches this number, the offer is full.
 */
export const FOUNDING_MEMBER_LIMIT = 50;

/**
 * How long (in seconds) to cache the founding-count query result before
 * revalidating against the database.
 */
const FOUNDING_COUNT_REVALIDATE_SECONDS = 60;

const FOUNDING_COUNT_CACHE_KEY = ["marketing", "founding-count"];

export interface FoundingCount {
  count: number;
  isFull: boolean;
}

async function fetchFoundingCount(): Promise<FoundingCount> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_founding_user", true);

  if (error) {
    throw new Error(`Failed to fetch founding-user count: ${error.message}`);
  }

  const safeCount = count ?? 0;

  return {
    count: safeCount,
    isFull: safeCount >= FOUNDING_MEMBER_LIMIT,
  };
}

/**
 * Returns the current founding-member count along with whether the founding
 * cap has been reached. The result is cached for
 * {@link FOUNDING_COUNT_REVALIDATE_SECONDS} seconds via Next.js
 * `unstable_cache`, so callers can render this in any number of server
 * components without amplifying database load.
 *
 * Server-only — never import from a client component.
 */
export const getFoundingCount = unstable_cache(
  fetchFoundingCount,
  FOUNDING_COUNT_CACHE_KEY,
  { revalidate: FOUNDING_COUNT_REVALIDATE_SECONDS },
);
