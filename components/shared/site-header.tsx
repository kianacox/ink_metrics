import { AuthButton } from "@/components/auth/auth-button";
import Link from "next/link";
import { Suspense } from "react";
import { ThemeSwitcher } from "./theme-switcher";

/** Top bar for public and app shell routes (logo + auth CTAs). */
export function SiteHeader() {
  return (
    <header className="flex w-full justify-center border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm sm:h-16 sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2 font-semibold sm:gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center py-1 text-primary [-webkit-tap-highlight-color:transparent]"
          >
            inkMetrics
          </Link>
          <ThemeSwitcher />
        </div>
        <div className="flex min-w-0 justify-end">
          <Suspense
            fallback={
              <div
                aria-hidden
                className="h-9 w-20 animate-pulse rounded-md bg-muted"
              />
            }
          >
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
