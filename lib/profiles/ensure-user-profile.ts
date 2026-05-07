import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface EnsureUserProfileParams {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Maximum number of founding-member spots. New profiles created while the
 * count of existing founding profiles is below this limit are flagged as
 * founding users.
 */
const FOUNDING_USER_LIMIT = 50;

export async function ensureUserProfile({
  supabase,
  userId,
}: EnsureUserProfileParams) {
  if (!userId) {
    throw new Error("Cannot create a profile without a user id.");
  }

  const { count: foundingCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_founding_user", true);

  const isFoundingUser = (foundingCount ?? 0) < FOUNDING_USER_LIMIT;

  return supabase.from("profiles").upsert(
    {
      user_id: userId,
      default_currency: DEFAULT_CURRENCY,
      is_profile_complete: false,
      trial_started_at: new Date().toISOString(),
      is_founding_user: isFoundingUser,
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true,
    },
  );
}
