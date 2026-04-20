import { Suspense } from "react";
import { AddSessionModal } from "@/components/dashboard/session-form/add-session-modal";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { bootstrapUserProfile } from "@/lib/profiles/bootstrap-user-profile";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  const displayName = profile?.display_name ?? null;

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
      <Suspense>
        <DashboardTabs displayName={displayName} />
      </Suspense>
    </div>
  );
}
