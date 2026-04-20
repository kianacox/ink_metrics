import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionsErrorStateProps {
  onRetry: () => void;
}

export function ActionsErrorState({ onRetry }: ActionsErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <RefreshCw className="h-10 w-10 text-muted-foreground" />
      <p className="font-semibold text-foreground">Something went wrong</p>
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t load actions. Try refreshing.
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
