import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "@/lib/currency";

interface ProfileBootstrapPayload {
  user_id: string;
  default_currency: string;
}

interface ProfileBootstrapOptions {
  onConflict: string;
  ignoreDuplicates: boolean;
}

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
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true,
    },
  );
}
