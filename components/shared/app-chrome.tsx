import { SiteHeader } from "./site-header";
import { DesktopSidebarNav, MobileBottomNav } from "./app-nav";
import { createClient } from "@/lib/supabase/server";

export async function AppChrome({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  return (
    <>
      <main className="min-h-dvh min-h-[100dvh] flex flex-col items-center overflow-x-clip bg-background">
        <div className="flex-1 w-full flex flex-col items-center">
          <SiteHeader />
          <div
            className={`flex w-full max-w-6xl flex-1 gap-6 px-4 pt-6 sm:gap-8 sm:px-6 sm:pt-8 ${
              isAuthenticated
                ? "pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:pb-10"
                : "pb-8 sm:pb-10"
            }`}
          >
            {isAuthenticated ? <DesktopSidebarNav /> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-8 sm:gap-12">{children}</div>
          </div>
        </div>
      </main>
      {isAuthenticated ? <MobileBottomNav /> : null}
    </>
  );
}
