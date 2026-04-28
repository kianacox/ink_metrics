"use client";

import { Button } from "@/components/ui";
import { useLogout } from "./hooks/use-logout";

export function LogoutButton({ className }: { className?: string }) {
  const logout = useLogout();

  return (
    <Button variant="secondary" className={`shrink-0 ${className ?? ""}`} onClick={logout}>
      Log out
    </Button>
  );
}
