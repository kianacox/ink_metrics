import { Button } from "./button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button type="button" className="mt-3" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
