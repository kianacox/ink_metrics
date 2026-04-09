import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { SessionListItem } from "./session-listing";

const UNKNOWN_CLIENT_NAME = "Unknown client";

export interface SessionRow {
  session_id: string;
  price: number | null;
  session_duration: number | null;
  session_at: string | null;
  created_at?: string | null;
  clients?:
    | {
        name?: string | null;
      }
    | Array<{
        name?: string | null;
      }>
    | null;
}

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
    durationMinutes: row.session_duration ?? 0,
    createdAt: row.session_at ?? row.created_at ?? new Date(0).toISOString(),
  }));
}

export function formatSessionDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatSessionProfit(
  priceMinor: number,
  currencyCode: string = DEFAULT_CURRENCY,
): string {
  const amount = Number.isFinite(priceMinor) ? priceMinor / 100 : 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: DEFAULT_CURRENCY,
    }).format(amount);
  }
}

export function formatSessionDate(createdAtIso: string): string {
  const timestamp = Date.parse(createdAtIso);

  if (!Number.isFinite(timestamp)) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
