import { ensureUserProfile } from "@/lib/profiles/ensure-user-profile";

type EnsureProfileSupabaseClient = Parameters<
  typeof ensureUserProfile
>[0]["supabase"];

interface BootstrapUserProfileParams {
  supabase: EnsureProfileSupabaseClient;
  userId: string | null | undefined;
  source: string;
}

export async function bootstrapUserProfile({
  supabase,
  userId,
  source,
}: BootstrapUserProfileParams): Promise<void> {
  if (!userId) {
    return;
  }

  const { error: profileError } = await ensureUserProfile({
    supabase,
    userId,
  });

  if (profileError) {
    console.error("profile_bootstrap_failed", {
      source,
      userId,
      message: profileError.message,
    });
  }
}
