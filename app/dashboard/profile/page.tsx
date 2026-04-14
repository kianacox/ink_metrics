import { ProfilePageTabs } from "@/components/dashboard/profile/profile-page-tabs";
import { isUserProfileComplete } from "@/lib/profiles/is-user-profile-complete";
import { requireAuthenticatedUser } from "@/lib/supabase/require-authenticated-user";
import { createClient } from "@/lib/supabase/server";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await requireAuthenticatedUser({ supabase });

  const profileIsComplete = await isUserProfileComplete({
    supabase,
    userId: user.id,
  });

  if (!profileIsComplete) {
    redirect("/dashboard/profile-setup");
  }

  const [{ data: profileRows, error: profileError }, { data: compensationRows, error: compensationError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,default_currency,reporting_timezone,marketing_consent")
        .eq("user_id", user.id)
        .limit(1),
      supabase
        .from("artist_compensation_versions")
        .select(
          "pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor",
        )
        .eq("user_id", user.id)
        .is("effective_to", null)
        .limit(1),
    ]);

  if (profileError || compensationError) {
    throw new Error("Could not load profile settings.");
  }

  const profile = profileRows?.[0];
  const compensation = compensationRows?.[0];

  if (!profile?.default_currency || !compensation) {
    redirect("/dashboard/profile-setup");
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Manage your profile, compensation settings, and account preferences.
        </p>
      </div>

      <ProfilePageTabs
        initialEmail={user.email ?? ""}
        initialDisplayName={profile.display_name ?? ""}
        initialDefaultCurrency={profile.default_currency}
        initialReportingTimezone={
          profile.reporting_timezone ?? getDefaultReportingTimezone()
        }
        initialPayChairRent={compensation.pay_chair_rent}
        initialRentType={compensation.rent_type}
        initialFixedFrequency={compensation.fixed_frequency}
        initialFixedAmountMinor={compensation.fixed_amount_minor}
        initialCommissionRateBps={compensation.commission_rate_bps}
        initialCommissionCapped={compensation.commission_capped}
        initialCommissionCapFrequency={compensation.commission_cap_frequency}
        initialCommissionCapAmountMinor={compensation.commission_cap_amount_minor}
        initialMarketingConsent={profile.marketing_consent ?? false}
      />
    </div>
  );
}
