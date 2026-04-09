import { ProfileSetupFlow } from "@/components/dashboard/profile-setup/profile-setup-flow";
import { bootstrapUserProfile } from "@/lib/profiles/bootstrap-user-profile";
import { isUserProfileComplete } from "@/lib/profiles/is-user-profile-complete";
import { requireAuthenticatedUser } from "@/lib/supabase/require-authenticated-user";
import { createClient } from "@/lib/supabase/server";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { redirect } from "next/navigation";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const user = await requireAuthenticatedUser({ supabase });

  await bootstrapUserProfile({
    supabase,
    userId: user.id,
    source: "profile_setup_page",
  });

  const profileIsComplete = await isUserProfileComplete({
    supabase,
    userId: user.id,
  });

  if (profileIsComplete) {
    redirect("/dashboard");
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("default_currency,reporting_timezone")
    .eq("user_id", user.id)
    .limit(1);
  const initialCurrency = profileRows?.[0]?.default_currency ?? "GBP";
  const initialTimezone =
    profileRows?.[0]?.reporting_timezone ?? getDefaultReportingTimezone();

  return <ProfileSetupFlow initialCurrency={initialCurrency} initialTimezone={initialTimezone} />;
}
