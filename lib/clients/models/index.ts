import type { SessionDateRangePreset } from "@/lib/timezones";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { SessionDateRangePreset as ClientDateRangePreset };

export type ClientSortField = "session_count" | "total_value";

export interface ClientListItem {
  id: string;
  name: string;
  contactInfo: string | null;
  createdAt: string;
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
  pageIndex: number;
  pageSize: number;
  dateRange: SessionDateRangePreset;
}

export interface FetchClientsPageResult {
  rows: ClientListItem[];
  hasNextPage: boolean;
  totalCount: number;
}

export interface ClientCreatePayload {
  name: string;
  contactInfo: string;
}

export interface ClientUpdatePayload {
  name: string;
  contactInfo: string;
}
