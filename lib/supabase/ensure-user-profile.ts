import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "@/lib/currency";

/** Insert a profiles row if missing (`user_id` is PK). Does not overwrite an existing row. */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ error: { message: string; code?: string } | null }> {
  const { error } = await supabase.from("profiles").upsert(
    { user_id: userId, default_currency: DEFAULT_CURRENCY },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  return { error };
}
