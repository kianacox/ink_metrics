import type { SupabaseClient } from "@supabase/supabase-js";

interface IsUserProfileCompleteParams {
  supabase: SupabaseClient;
  userId: string;
}

export async function isUserProfileComplete({
  supabase,
  userId,
}: IsUserProfileCompleteParams): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_profile_complete")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    return false;
  }

  return Boolean(data?.[0]?.is_profile_complete);
}
