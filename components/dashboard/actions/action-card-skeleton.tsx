import { Skeleton } from "@/components/ui";

export function ActionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-none border bg-card p-6 shadow text-card-foreground">
      <Skeleton className="mb-2 h-5 w-1/3" />
      <Skeleton className="mb-1 h-4 w-2/3" />
      <Skeleton className="mb-6 h-4 w-1/4" />
      <div className="flex justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
