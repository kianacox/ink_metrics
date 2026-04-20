import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface EnsureUserProfileParams {
  supabase: SupabaseClient;
  userId: string;
}

export async function ensureUserProfile({
  supabase,
  userId,
}: EnsureUserProfileParams) {
  if (!userId) {
    throw new Error("Cannot create a profile without a user id.");
  }

  return supabase.from("profiles").upsert(
    {
      user_id: userId,
      default_currency: DEFAULT_CURRENCY,
      is_profile_complete: false,
      trial_started_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true,
    },
  );
}
