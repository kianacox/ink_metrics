import { Button } from "@/components/ui";
import { formatSessionProfit } from "@/components/dashboard/sessions/utils/session-formatting";
import type { ClientListItem } from "@/lib/clients/models";
import { Pencil, Trash2 } from "lucide-react";

interface ClientsTableProps {
  clients: ClientListItem[];
  currencyCode: string;
  dateRangeLabel: string;
  onEditClient: (client: ClientListItem) => void;
  onDeleteClient: (client: ClientListItem) => void;
}

function formatLastSessionDate(isoDate: string | null): string | null {
  if (!isoDate) {
    return null;
  }
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClientsTable({
  clients,
  currencyCode,
  dateRangeLabel,
  onEditClient,
  onDeleteClient,
}: ClientsTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
      <table className="w-full border-collapse">
        <thead className="bg-muted/40">
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Last session</th>
            <th className="px-4 py-3 font-medium">Sessions ({dateRangeLabel})</th>
            <th className="px-4 py-3 font-medium">Value ({dateRangeLabel})</th>
            <th className="px-4 py-3 font-medium">Lifetime sessions</th>
            <th className="px-4 py-3 font-medium">Lifetime value</th>
            <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const isReturning = client.lifetimeSessionCount > 1;
            const lastSessionLabel = formatLastSessionDate(client.lastSessionAt);

            return (
              <tr key={client.id} className="border-t border-border">
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  <div className="flex flex-col items-start gap-1">
                    {isReturning ? (
                      <span className="inline-flex items-center whitespace-nowrap rounded-none bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                        Returning client
                      </span>
                    ) : null}
                    <span>{client.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {client.contactInfo ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {lastSessionLabel ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {client.rangeSessionCount}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {formatSessionProfit(client.rangeTotalValueMinor, currencyCode)}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {client.lifetimeSessionCount}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {formatSessionProfit(client.lifetimeTotalValueMinor, currencyCode)}
                </td>
                <td className="w-px whitespace-nowrap px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onEditClient(client)}
                      aria-label={`Edit client ${client.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <span
                      title={
                        client.lifetimeSessionCount > 0
                          ? "This client is linked to sessions and cannot be deleted."
                          : undefined
                      }
                      className={client.lifetimeSessionCount > 0 ? "cursor-not-allowed" : undefined}
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteClient(client)}
                        aria-label={`Delete client ${client.name}`}
                        disabled={client.lifetimeSessionCount > 0}
                        className={client.lifetimeSessionCount > 0 ? "pointer-events-none" : undefined}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
