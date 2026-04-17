import { AddSessionModal } from "@/components/dashboard/session-form/add-session-modal";
import { DashboardAnalyticsView } from "@/components/dashboard/analytics/dashboard-analytics-view";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { computeCurrentMonthWindow } from "@/lib/dashboard-analytics";
import { bootstrapUserProfile } from "@/lib/profiles/bootstrap-user-profile";
import { isUserProfileComplete } from "@/lib/profiles/is-user-profile-complete";
import { requireAuthenticatedUser } from "@/lib/supabase/require-authenticated-user";
import { createClient } from "@/lib/supabase/server";
import { getDefaultReportingTimezone, getEffectiveReportingTimezone } from "@/lib/timezones";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireAuthenticatedUser({ supabase });

  await bootstrapUserProfile({
    supabase,
    userId: user.id,
    source: "dashboard_page",
  });

  const profileIsComplete = await isUserProfileComplete({
    supabase,
    userId: user.id,
  });

  if (!profileIsComplete) {
    redirect("/dashboard/profile-setup");
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("default_currency,reporting_timezone")
    .eq("user_id", user.id)
    .limit(1);
  const profile = profileRows?.[0];
  const reportingTimezone = getEffectiveReportingTimezone(
    profile?.reporting_timezone ?? getDefaultReportingTimezone(),
  );
  const monthWindow = computeCurrentMonthWindow({ timezone: reportingTimezone });
  const defaultCurrency = profile?.default_currency ?? DEFAULT_CURRENCY;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {monthWindow.monthLabel} stats
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your monthly business snapshot uses your reporting timezone and updates
          as you log sessions and expenses.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          Quick actions
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Capture session revenue and duration in under a minute.
        </p>
        <AddSessionModal />
      </section>
      <DashboardAnalyticsView currencyCode={defaultCurrency} />
    </div>
  );
}
