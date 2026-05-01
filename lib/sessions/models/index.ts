import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type {
  CompositeCursor,
  CursorPaginatedResult,
} from "@/lib/pagination/cursor";
import type { SessionDateRangePreset } from "@/lib/timezones";
import type { SupabaseClient } from "@supabase/supabase-js";

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
