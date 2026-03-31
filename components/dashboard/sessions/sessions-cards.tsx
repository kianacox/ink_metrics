import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
}

export function SessionsCards({ sessions, currencyCode }: SessionsCardsProps) {
  return (
    <div className="grid gap-3 sm:hidden">
      {sessions.map((session) => (
        <Card key={session.id} className="border-border">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-base">{session.clientName}</CardTitle>
            <CardDescription>
              {formatSessionDate(session.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
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
