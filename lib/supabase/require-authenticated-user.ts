import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

interface RequireAuthenticatedUserParams {
  supabase: SupabaseClient;
  redirectTo?: string;
}

export async function requireAuthenticatedUser({
  supabase,
  redirectTo = "/auth/login",
}: RequireAuthenticatedUserParams): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(redirectTo);
  }

  return user;
}
