import Link from "next/link";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { PublicAuthLinks } from "./public-auth-links";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <Button asChild variant="outline" className="shrink-0">
        <Link href="/dashboard">Dashboard</Link>
      </Button>
      <span className="text-muted-foreground hidden md:inline max-w-[10rem] lg:max-w-[12rem] truncate text-xs sm:text-sm">
        {user.email}
      </span>
      <LogoutButton />
    </div>
  ) : (
    <PublicAuthLinks />
  );
}
