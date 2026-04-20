export function ActionCardSkeleton() {
  return (
    <div className="animate-pulse rounded-none border bg-card p-6 shadow text-card-foreground">
      <div className="mb-2 h-5 w-1/3 rounded bg-muted" />
      <div className="mb-1 h-4 w-2/3 rounded bg-muted" />
      <div className="mb-6 h-4 w-1/4 rounded bg-muted" />
      <div className="flex justify-between">
        <div className="h-8 w-28 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}
