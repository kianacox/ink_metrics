import { CheckCircle2 } from "lucide-react";

export function ActionsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
      <p className="font-semibold text-foreground">All caught up</p>
      <p className="text-sm text-muted-foreground">
        No actions right now — your client list looks healthy.
      </p>
    </div>
  );
}
