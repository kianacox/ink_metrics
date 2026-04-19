import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionProfit,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";
import { Button } from "@/components/ui";
import { Pencil, Trash2 } from "lucide-react";

interface SessionsTableProps {
  sessions: SessionListItem[];
  currencyCode: string;
  reportingTimezone: string;
  onEditSession: (session: SessionListItem) => void;
  onDeleteSession: (session: SessionListItem) => void;
}

export function SessionsTable({
  sessions,
  currencyCode,
  reportingTimezone,
  onEditSession,
  onDeleteSession,
}: SessionsTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
      <table className="w-full border-collapse">
        <thead className="bg-muted/40">
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Session length</th>
            <th className="px-4 py-3 font-medium">Session profit</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-t border-border">
              <td className="px-4 py-3 text-sm font-medium text-foreground">
                {session.clientName}
                {session.throughAds ? (
                  <span className="ml-2 inline-flex rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Advertising
                  </span>
                ) : null}
                {session.inProgress ? (
                  <span className="ml-2 inline-flex rounded border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-400/40 dark:text-amber-400">
                    Follow-up needed
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatSessionDate(session.createdAt, reportingTimezone)}
              </td>
              <td className="px-4 py-3 text-sm text-foreground">
                {formatSessionDuration(session.durationMinutes)}
              </td>
              <td className="px-4 py-3 text-sm text-foreground">
                {formatSessionProfit(session.priceMinor, currencyCode)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onEditSession(session)}
                    aria-label={`Edit session for ${session.clientName}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeleteSession(session)}
                    aria-label={`Delete session for ${session.clientName}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
