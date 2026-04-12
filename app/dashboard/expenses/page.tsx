import { ExpensesView } from "@/components/dashboard/expenses/expenses-view";
import { isUserProfileComplete } from "@/lib/profiles/is-user-profile-complete";
import { requireAuthenticatedUser } from "@/lib/supabase/require-authenticated-user";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const user = await requireAuthenticatedUser({ supabase });

  const profileIsComplete = await isUserProfileComplete({
    supabase,
    userId: user.id,
  });

  if (!profileIsComplete) {
    redirect("/dashboard/profile-setup");
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Expenses
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Track your supply and business costs to get a complete picture of your profitability.
        </p>
      </div>
      <ExpensesView />
    </div>
  );
}
