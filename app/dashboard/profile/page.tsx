import { ProfilePageTabs } from "@/components/dashboard/profile/profile-page-tabs";
import { fetchProfileSettings } from "@/lib/profiles/fetch-profile-settings";
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

  const settings = await fetchProfileSettings({
    supabase,
    userId: user.id,
  });

  if (!settings) {
    redirect("/dashboard/profile-setup");
  }
  const { profile, compensation } = settings;

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
