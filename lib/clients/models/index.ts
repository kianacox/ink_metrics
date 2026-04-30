import type { SessionDateRangePreset } from "@/lib/timezones";
import type { CompositeCursor, CursorPaginatedResult } from "@/lib/pagination/cursor";
import type { ClientTier } from "@/lib/clients/tier";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { SessionDateRangePreset as ClientDateRangePreset };

export type ClientSortField = "session_count" | "total_value";

export interface ClientListItem {
  id: string;
  name: string;
  contactInfo: string | null;
  createdAt: string;
  lastSessionAt: string | null;
  lifetimeSessionCount: number;
  lifetimeTotalValueMinor: number;
  rangeSessionCount: number;
  rangeTotalValueMinor: number;
}

export interface FetchClientsPageParams {
  supabase: SupabaseClient;
  userId: string;
  reportingTimezone: string;
  searchQuery: string;
  sortField: ClientSortField;
  cursor: CompositeCursor | null;
  limit: number;
  dateRange: SessionDateRangePreset;
  tier?: ClientTier | null;
}

export type FetchClientsPageResult = CursorPaginatedResult<ClientListItem>;

export interface ClientCreatePayload {
  name: string;
  contactInfo: string;
}

export interface ClientUpdatePayload {
  name: string;
  contactInfo: string;
}
