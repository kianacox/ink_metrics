import type { SupabaseClient } from "@supabase/supabase-js";

interface GetProfileDisplayNameParams {
  supabase: SupabaseClient;
  userId: string;
}

export async function getProfileDisplayName({
  supabase,
  userId,
}: GetProfileDisplayNameParams): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .single();

  return data?.display_name ?? null;
}
