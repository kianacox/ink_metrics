"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";

/** Sign in / Sign up CTAs for guests; hides the redundant link on login vs signup pages. */
export function PublicAuthLinks() {
  const pathname = usePathname();
  const onLogin = pathname === "/auth/login";
  const onSignUp = pathname === "/auth/sign-up";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!onLogin ? (
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/auth/login">Sign in</Link>
        </Button>
      ) : null}
      {!onSignUp ? (
        <Button asChild variant="default" className="shrink-0">
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      ) : null}
    </div>
  );
}
