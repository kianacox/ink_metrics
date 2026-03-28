import { AddSessionModal } from "@/components/dashboard/add-session-modal";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your financial heartbeat overview will live here. For now, log
          sessions as you finish them—insights and charts come next.
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

      <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8">
        Placeholder: net profit, LTV, and seasonal trends will appear here.
      </section>
    </div>
  );
}
