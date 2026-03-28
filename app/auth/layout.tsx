import { SiteHeader } from "@/components/shared/site-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh min-h-[100dvh] w-full flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
