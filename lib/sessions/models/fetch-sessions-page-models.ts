import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionDateRangePreset } from "@/lib/timezones";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FetchSessionsPageParams {
  supabase: SupabaseClient;
  userId: string;
  reportingTimezone: string;
  searchQuery: string;
  sortField: SessionSortField;
  pageIndex: number;
  pageSize: number;
  dateRange: SessionDateRangePreset;
}

export interface FetchSessionsPageResult {
  rows: SessionRow[];
  hasNextPage: boolean;
  totalCount: number;
}
