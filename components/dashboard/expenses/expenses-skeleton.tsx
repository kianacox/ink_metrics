import { Skeleton } from "@/components/ui";

function ExpenseCardSkeleton() {
  return (
    <div className="rounded-none border bg-card p-6 shadow text-card-foreground">
      {/* Top section: category badge + title on left, two buttons on right */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="mb-1.5 h-5 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      {/* Bottom grid: Amount + Date fields */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="mb-1 h-3 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="mb-1 h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ExpensesSkeleton() {
  return (
    <div className="grid gap-3">
      <ExpenseCardSkeleton />
      <ExpenseCardSkeleton />
      <ExpenseCardSkeleton />
    </div>
  );
}
