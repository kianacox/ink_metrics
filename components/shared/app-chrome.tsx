import { SiteHeader } from "./site-header";
import { DesktopSidebarNav, MobileBottomNav } from "./app-nav";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh min-h-[100dvh] flex flex-col items-center bg-background">
      <div className="flex-1 w-full flex flex-col items-center">
        <SiteHeader />
        <div className="flex w-full max-w-6xl flex-1 gap-6 px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-6 sm:gap-8 sm:px-6 sm:pt-8 lg:pb-10">
          <DesktopSidebarNav />
          <div className="flex-1 flex flex-col gap-8 sm:gap-12">{children}</div>
        </div>
        <MobileBottomNav />
      </div>
    </main>
  );
}
