import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

function MarketingHeader({
  activePath,
}: {
  activePath: "product" | "pricing";
}) {
  return (
    <header className="flex w-full justify-center border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:h-16 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center py-1 font-semibold text-primary [-webkit-tap-highlight-color:transparent]"
          >
            inkMetrics
          </Link>
          <Link
            href="/pricing"
            className={`inline-flex min-h-11 items-center py-1 text-sm font-medium transition-colors sm:hidden ${
              activePath === "pricing"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Pricing
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activePath === "product"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activePath === "pricing"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pricing
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Suspense
            fallback={
              <div
                aria-hidden
                className="h-9 w-9 animate-pulse rounded-md bg-muted"
              />
            }
          >
            <ThemeSwitcher />
          </Suspense>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="flex w-full justify-center border-t border-border bg-background">
      <div className="flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <span className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} inkMetrics
        </span>
        <nav className="flex items-center gap-4">
          <Link
            href="/privacy-policy"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-and-conditions"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms and Conditions
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function MarketingLayout({
  children,
  activePath = "product",
}: {
  children: React.ReactNode;
  activePath?: "product" | "pricing";
}) {
  return (
    <main className="flex min-h-dvh min-h-[100dvh] flex-col bg-background">
      <MarketingHeader activePath={activePath} />
      <div className="flex flex-1 flex-col items-center">
        <div className="w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          {children}
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
