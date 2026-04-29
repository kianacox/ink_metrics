import { Suspense } from "react";
import { AddSessionModal } from "@/components/dashboard/session-form/add-session-modal";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { DashboardTabsSkeleton } from "@/components/dashboard/dashboard-tabs-skeleton";
import { bootstrapUserProfile } from "@/lib/profiles/bootstrap-user-profile";
import { getProfileDisplayName } from "@/lib/profiles/get-profile-display-name";
import { isUserProfileComplete } from "@/lib/profiles/is-user-profile-complete";
import { requireAuthenticatedUser } from "@/lib/supabase/require-authenticated-user";
import { createClient } from "@/lib/supabase/server";
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

  const displayName = await getProfileDisplayName({ supabase, userId: user.id });

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          Quick actions
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Capture session revenue and duration in under a minute.
        </p>
        <AddSessionModal />
      </section>
      <Suspense fallback={<DashboardTabsSkeleton />}>
        <DashboardTabs displayName={displayName} />
      </Suspense>
    </div>
  );
}
