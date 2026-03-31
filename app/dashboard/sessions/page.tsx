import { SessionsView } from "@/components/dashboard/sessions/sessions-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Sessions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Review every recorded session in one place with search and sorting.
        </p>
      </div>
      <SessionsView />
    </div>
  );
}
