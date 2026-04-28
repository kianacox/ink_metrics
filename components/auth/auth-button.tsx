import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { IconLogoutButton } from "./icon-logout-button";
import { PublicAuthLinks } from "./public-auth-links";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center justify-end gap-2 sm:gap-3">
      <span className="hidden md:inline max-w-[10rem] lg:max-w-[12rem] truncate text-xs text-muted-foreground sm:text-sm">
        {user.email}
      </span>
      <IconLogoutButton className="sm:hidden" />
      <LogoutButton className="hidden sm:flex" />
    </div>
  ) : (
    <PublicAuthLinks />
  );
}
