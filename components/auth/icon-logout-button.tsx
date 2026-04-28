"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { useLogout } from "./hooks/use-logout";

export function IconLogoutButton({ className }: { className?: string }) {
  const logout = useLogout();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => void logout()}
      aria-label="Log out"
    >
      <LogOut size={16} className="text-muted-foreground" />
    </Button>
  );
}
