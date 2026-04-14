interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading…" }: LoadingStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-foreground"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
