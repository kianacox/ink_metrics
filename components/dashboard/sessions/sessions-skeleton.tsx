import { Skeleton } from "@/components/ui";

function SessionCardSkeleton() {
  return (
    <div className="rounded-none border bg-card p-6 shadow text-card-foreground">
      {/* Header: client name + date on left, Edit/Delete buttons on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="mb-1.5 h-5 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex shrink-0 gap-1">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      {/* Content grid: profit stat */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="mb-1 h-3 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function SessionsSkeleton() {
  return (
    <div className="grid gap-3">
      <SessionCardSkeleton />
      <SessionCardSkeleton />
      <SessionCardSkeleton />
    </div>
  );
}
