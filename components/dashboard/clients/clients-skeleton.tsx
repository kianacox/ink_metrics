import { Skeleton } from "@/components/ui";

function ClientCardSkeleton() {
  return (
    <div className="rounded-none border bg-card p-6 shadow text-card-foreground">
      {/* Header: badge + name/contact on left, edit/delete buttons on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="mb-1.5 h-4 w-24" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-0.5 h-4 w-28" />
        </div>
        <div className="flex shrink-0 gap-1">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      {/* Stats grid: sessions (range), value (range), lifetime sessions, lifetime value, last session */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="mb-1 h-3 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div>
          <Skeleton className="mb-1 h-3 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="mb-1 h-3 w-28" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div>
          <Skeleton className="mb-1 h-3 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="col-span-2">
          <Skeleton className="mb-1 h-3 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

export function ClientsSkeleton() {
  return (
    <div className="grid gap-3">
      <ClientCardSkeleton />
      <ClientCardSkeleton />
      <ClientCardSkeleton />
    </div>
  );
}
