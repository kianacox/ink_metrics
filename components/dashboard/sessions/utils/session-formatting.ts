import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { SessionListItem } from "./session-listing";

const UNKNOWN_CLIENT_NAME = "Unknown client";

export interface SessionRow {
  session_id: string;
  client_id?: string | null;
  price: number | null;
  session_at: string | null;    // now a "YYYY-MM-DD" date string
  through_ads?: boolean | null;
  in_progress?: boolean | null;
  is_latest_for_client?: boolean | null;
  created_at?: string | null;
  compensation_version_id?: string | null;
  artist_compensation_versions?:
    | {
        compensation_version_id?: string | null;
        pay_chair_rent?: boolean | null;
        rent_type?: string | null;
        fixed_frequency?: string | null;
        fixed_amount_minor?: number | null;
        commission_rate_bps?: number | null;
        commission_capped?: boolean | null;
        commission_cap_frequency?: string | null;
        commission_cap_amount_minor?: number | null;
      }
    | Array<{
        compensation_version_id?: string | null;
        pay_chair_rent?: boolean | null;
        rent_type?: string | null;
        fixed_frequency?: string | null;
        fixed_amount_minor?: number | null;
        commission_rate_bps?: number | null;
        commission_capped?: boolean | null;
        commission_cap_frequency?: string | null;
        commission_cap_amount_minor?: number | null;
      }>
    | null;
  clients?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
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
