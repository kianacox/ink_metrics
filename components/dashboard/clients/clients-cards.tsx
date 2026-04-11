import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatSessionProfit } from "@/components/dashboard/sessions/utils/session-formatting";
import type { ClientListItem } from "@/lib/clients/models";

interface ClientsCardsProps {
  clients: ClientListItem[];
  currencyCode: string;
  dateRangeLabel: string;
  onEditClient: (client: ClientListItem) => void;
  onDeleteClient: (client: ClientListItem) => void;
}

export function ClientsCards({
  clients,
  currencyCode,
  dateRangeLabel,
  onEditClient,
  onDeleteClient,
}: ClientsCardsProps) {
  return (
    <div className="grid gap-3 sm:hidden">
      {clients.map((client) => (
        <Card key={client.id} className="border-border">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{client.name}</CardTitle>
                {client.contactInfo ? (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {client.contactInfo}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/70 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-800 dark:border-emerald-400/70 dark:text-emerald-300 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
                  onClick={() => onEditClient(client)}
                  aria-label={`Edit client ${client.name}`}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteClient(client)}
                  aria-label={`Delete client ${client.name}`}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">Sessions ({dateRangeLabel})</p>
              <p className="text-sm font-medium text-foreground">
                {client.rangeSessionCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Value ({dateRangeLabel})</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionProfit(client.rangeTotalValueMinor, currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lifetime sessions</p>
              <p className="text-sm font-medium text-foreground">
                {client.lifetimeSessionCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lifetime value</p>
              <p className="text-sm font-medium text-foreground">
                {formatSessionProfit(client.lifetimeTotalValueMinor, currencyCode)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
