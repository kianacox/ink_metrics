import { createAdminClient } from "@/lib/supabase/admin";

const FOUNDING_FIXTURE_EMAIL_PREFIX = "founding-fixture-";
const FOUNDING_FIXTURE_EMAIL_DOMAIN = "example.com";
const FOUNDING_FIXTURE_PASSWORD = "Password123!";

/**
 * Returns the current count of profiles flagged as founding members.
 */
export async function getFoundingProfileCount(): Promise<number> {
  const adminClient = createAdminClient();
  const { count, error } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_founding_user", true);
  if (error) {
    throw new Error(`Failed to count founding profiles: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Creates a confirmed auth user plus a profile flagged as a founding member.
 * Returns the user_id for cleanup purposes.
 */
async function createFoundingFixtureProfile(index: number): Promise<string> {
  const adminClient = createAdminClient();
  const email = `${FOUNDING_FIXTURE_EMAIL_PREFIX}${index}-${Date.now()}@${FOUNDING_FIXTURE_EMAIL_DOMAIN}`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: FOUNDING_FIXTURE_PASSWORD,
    email_confirm: true,
  });
  if (error || !data?.user) {
    throw new Error(
      `Failed to create founding fixture auth user: ${error?.message ?? "no user returned"}`,
    );
  }

  const userId = data.user.id;

  // The DB trigger that backfills profiles on signup may or may not have
  // already created a row. Use upsert to ensure the profile exists and is
  // flagged as a founding user.
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      user_id: userId,
      is_founding_user: true,
      default_currency: "GBP",
      reporting_timezone: "Europe/London",
      week_starts_on: 1,
      is_profile_complete: false,
    },
    { onConflict: "user_id" },
  );
  if (profileError) {
    throw new Error(
      `Failed to upsert founding fixture profile: ${profileError.message}`,
    );
  }

  return userId;
}

/**
 * Brings the founding-member count up to the target value by inserting
 * additional founding-flagged profiles. Returns the list of user_ids that
 * were created so callers can clean up afterwards.
 *
 * If the current count already meets or exceeds the target, this is a no-op.
 */
export async function seedFoundingProfilesUpTo(
  target: number,
): Promise<string[]> {
  const currentCount = await getFoundingProfileCount();
  const needed = Math.max(0, target - currentCount);
  const createdUserIds: string[] = [];

  for (let index = 0; index < needed; index += 1) {
    const userId = await createFoundingFixtureProfile(index);
    createdUserIds.push(userId);
  }

  return createdUserIds;
}

/**
 * Removes auth users (and their cascading profile rows) created by
 * `seedFoundingProfilesUpTo`. Safe to call with an empty array.
 */
export async function cleanupFoundingFixtureProfiles(
  userIds: string[],
): Promise<void> {
  const adminClient = createAdminClient();
  for (const userId of userIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(
        `Failed to delete founding fixture user ${userId}: ${error.message}`,
      );
    }
  }
}
