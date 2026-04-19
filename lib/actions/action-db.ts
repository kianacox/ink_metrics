import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchActionOwner(
  supabase: SupabaseClient,
  actionId: string,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase
    .from("client_actions")
    .select("action_id, user_id")
    .eq("action_id", actionId)
    .single();

  if (error || !data) {
    return { error: "Action not found." };
  }

  return { userId: data.user_id as string };
}

export async function dismissAction(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
): Promise<{ dismissed: boolean } | { error: string }> {
  const { data, error } = await supabase
    .from("client_actions")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("action_id", actionId)
    .eq("user_id", userId)
    .select("action_id");

  if (error) {
    return { error: "Could not dismiss action." };
  }

  return { dismissed: (data ?? []).length > 0 };
}
