import type { SupabaseClient } from "@supabase/supabase-js";

interface FetchProfileSettingsArgs {
  supabase: SupabaseClient;
  userId: string;
}

export async function fetchProfileSettings({
  supabase,
  userId,
}: FetchProfileSettingsArgs) {
  const [{ data: profileRows, error: profileError }, { data: compensationRows, error: compensationError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,default_currency,reporting_timezone,marketing_consent")
        .eq("user_id", userId)
        .limit(1),
      supabase
        .from("artist_compensation_versions")
        .select(
          "pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor",
        )
        .eq("user_id", userId)
        .is("effective_to", null)
        .limit(1),
    ]);

  if (profileError || compensationError) {
    throw new Error("Could not load profile settings.");
  }

  const profile = profileRows?.[0];
  const compensation = compensationRows?.[0];

  if (!profile?.default_currency || !compensation) {
    return null;
  }

  return {
    profile,
    compensation,
  };
}
