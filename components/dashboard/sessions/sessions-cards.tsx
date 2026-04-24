import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import { AnimatedCard } from "@/components/ui/animated-card";
import {
  formatSessionDate,
  formatSessionProfit,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";

interface SessionsCardsProps {
  sessions: SessionListItem[];
  currencyCode: string;
  onEditSession: (session: SessionListItem) => void;
  onDeleteSession: (session: SessionListItem) => void;
}

export function SessionsCards({
  sessions,
  currencyCode,
  onEditSession,
  onDeleteSession,
}: SessionsCardsProps) {
  return (
    <div className="grid gap-3 sm:hidden">
      {sessions.map((session, idx) => (
        <AnimatedCard key={session.id} index={idx} className="border-border">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{session.clientName}</CardTitle>
                <CardDescription>
                  {formatSessionDate(session.sessionDate)}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
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
              <p className="col-span-2 rounded-none border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                Through Ads
              </p>
            ) : null}
            {session.inProgress && session.isLatestForClient ? (
              <p className="col-span-2 rounded-none border border-gold/50 bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold">
                Follow-up session needed
              </p>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionProfit(session.priceMinor, currencyCode)}
              </p>
            </div>
          </CardContent>
        </AnimatedCard>
      ))}
    </div>
  );
}
