import { ensureUserProfile } from "@/lib/profiles/ensure-user-profile";

type EnsureProfileSupabaseClient = Parameters<
  typeof ensureUserProfile
>[0]["supabase"];

interface BootstrapUserProfileParams {
  supabase: EnsureProfileSupabaseClient;
  userId: string | null | undefined;
  source: string;
}

function redactUserId(userId: string): string {
  if (userId.length <= 8) {
    return "***";
  }

  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
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
    const errorCode =
      typeof (profileError as { code?: unknown }).code === "string"
        ? (profileError as { code: string }).code
        : "UNKNOWN";

    console.error("profile_bootstrap_failed", {
      source,
      userRef: redactUserId(userId),
      errorCode,
      message:
        process.env.NODE_ENV === "production"
          ? "Profile bootstrap failed."
          : profileError.message,
    });
  }
}
