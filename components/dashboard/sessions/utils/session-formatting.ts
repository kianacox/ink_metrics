import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { SessionRow } from "@/lib/sessions/models";
import type { SessionListItem } from "./session-listing";

const UNKNOWN_CLIENT_NAME = "Unknown client";

function getClientName(clients: SessionRow["clients"]): string {
  if (Array.isArray(clients)) {
    const firstClientName = clients[0]?.name?.trim();
    return firstClientName || UNKNOWN_CLIENT_NAME;
  }
  const clientName = clients?.name?.trim();
  return clientName || UNKNOWN_CLIENT_NAME;
}

export function mapSessionRowsToListItems(rows: SessionRow[]): SessionListItem[] {
  return rows.map((row) => ({
    id: row.session_id,
    clientName: getClientName(row.clients),
    priceMinor: row.price ?? 0,
    sessionDate: row.session_at ?? "",
    createdAt: row.created_at ?? new Date(0).toISOString(),
    throughAds: row.through_ads === true,
    inProgress: row.in_progress === true,
    isLatestForClient: row.is_latest_for_client !== false,
  }));
}

export function formatSessionDate(sessionDate: string): string {
  const parts = sessionDate.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return "Unknown date";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(year, month - 1, day),
    );
  } catch {
    return sessionDate;
  }
}

export function formatSessionProfit(
  priceMinor: number,
  currencyCode: string = DEFAULT_CURRENCY,
): string {
  const amount = Number.isFinite(priceMinor) ? priceMinor / 100 : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: DEFAULT_CURRENCY, currencyDisplay: "narrowSymbol" }).format(amount);
  }
}
