import type {
  CompositeCursor,
  CursorPaginatedResult,
} from "@/lib/pagination/cursor";
import type { SessionDateRangePreset } from "@/lib/timezones";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionSortField = "date" | "profit";

interface CompensationVersionFields {
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
    | CompensationVersionFields
    | Array<CompensationVersionFields>
    | null;
  clients?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
}

export interface FetchSessionsPageParams {
  supabase: SupabaseClient;
  userId: string;
  reportingTimezone: string;
  searchQuery: string;
  sortField: SessionSortField;
  cursor: CompositeCursor | null;
  limit: number;
  dateRange: SessionDateRangePreset;
}

export type FetchSessionsPageResult = CursorPaginatedResult<SessionRow>;

export interface SessionCreatePayload {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDate: string;
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface SessionUpdatePayload {
  priceMinor: number;
  sessionDate: string;
  inProgress: boolean;
}

export interface SessionCreatePayloadCandidate {
  selectedClientId?: unknown;
  createNewClient?: unknown;
  clientName?: unknown;
  clientContact?: unknown;
  priceMinor?: unknown;
  sessionDate?: unknown;
  throughAds?: unknown;
  inProgress?: unknown;
}

export interface SessionUpdatePayloadCandidate {
  priceMinor?: unknown;
  sessionDate?: unknown;
  inProgress?: unknown;
  [key: string]: unknown;
}
