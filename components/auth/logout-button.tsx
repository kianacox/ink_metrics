"use client";

import { Button } from "@/components/ui";
import { useLogout } from "./hooks/use-logout";

export function LogoutButton() {
  const logout = useLogout();

  return (
    <Button variant="secondary" className="shrink-0" onClick={logout}>
      Log out
    </Button>
  );
}
