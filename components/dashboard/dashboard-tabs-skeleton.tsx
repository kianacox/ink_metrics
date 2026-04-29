import { Skeleton } from "@/components/ui";

/**
 * Loading placeholder for {@link DashboardTabs}. Mirrors the tablist + content
 * card layout so the page does not collapse height while the client component
 * resolves.
 */
export function DashboardTabsSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-6 sm:gap-8"
      data-testid="dashboard-tabs-skeleton"
    >
      <div className="flex gap-1 border-b border-border">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
