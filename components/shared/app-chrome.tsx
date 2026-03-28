import { SiteHeader } from "./site-header";
import { ThemeSwitcher } from "./theme-switcher";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh min-h-[100dvh] flex flex-col items-center bg-background">
      <div className="flex-1 w-full flex flex-col gap-8 sm:gap-12 items-center">
        <SiteHeader />
        <div className="flex-1 flex flex-col gap-8 sm:gap-12 w-full max-w-5xl px-4 pb-8 sm:px-6 sm:pb-10">
          {children}
        </div>
        <footer className="w-full flex items-center justify-center border-t border-border mx-auto text-center text-xs gap-8 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-8 text-muted-foreground">
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
