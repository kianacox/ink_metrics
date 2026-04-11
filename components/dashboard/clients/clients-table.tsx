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

export function ClientsTable({
  clients,
  currencyCode,
  dateRangeLabel,
  onEditClient,
  onDeleteClient,
}: ClientsTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
      <table className="w-full border-collapse">
        <thead className="bg-muted/40">
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Sessions ({dateRangeLabel})</th>
            <th className="px-4 py-3 font-medium">Value ({dateRangeLabel})</th>
            <th className="px-4 py-3 font-medium">Lifetime sessions</th>
            <th className="px-4 py-3 font-medium">Lifetime value</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-t border-border">
              <td className="px-4 py-3 text-sm font-medium text-foreground">
                {client.name}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {client.contactInfo ?? "—"}
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
              <td className="px-4 py-3">
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
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeleteClient(client)}
                    aria-label={`Delete client ${client.name}`}
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
