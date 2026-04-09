import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionProfit,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";

interface SessionsTableProps {
  sessions: SessionListItem[];
  currencyCode: string;
  reportingTimezone: string;
}

export function SessionsTable({
  sessions,
  currencyCode,
  reportingTimezone,
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
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-t border-border">
              <td className="px-4 py-3 text-sm font-medium text-foreground">
                {session.clientName}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
