import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionProfit,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";

interface SessionsCardsProps {
  sessions: SessionListItem[];
  currencyCode: string;
  reportingTimezone: string;
  onEditSession: (session: SessionListItem) => void;
  onDeleteSession: (session: SessionListItem) => void;
}

export function SessionsCards({
  sessions,
  currencyCode,
  reportingTimezone,
  onEditSession,
  onDeleteSession,
}: SessionsCardsProps) {
  return (
    <div className="grid gap-3 sm:hidden">
      {sessions.map((session) => (
        <Card key={session.id} className="border-border">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{session.clientName}</CardTitle>
                <CardDescription>
                  {formatSessionDate(session.createdAt, reportingTimezone)}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/70 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-800 dark:border-emerald-400/70 dark:text-emerald-300 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
                  onClick={() => onEditSession(session)}
                  aria-label={`Edit session for ${session.clientName}`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteSession(session)}
                  aria-label={`Delete session for ${session.clientName}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
            {session.throughAds ? (
              <p className="col-span-2 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                Through Ads
              </p>
            ) : null}
            {session.inProgress && session.isLatestForClient ? (
              <p className="col-span-2 rounded-md border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-400/40 dark:text-amber-400">
                Follow-up session needed
              </p>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">Length</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionDuration(session.durationMinutes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionProfit(session.priceMinor, currencyCode)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
