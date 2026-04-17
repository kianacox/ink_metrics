import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type { CompositeCursor } from "@/lib/pagination/cursor";
import type { CursorPaginatedResult } from "@/lib/pagination/cursor";
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
