import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionSortField } from "@/lib/sessions/models";
import type { SessionDateRangePreset } from "@/lib/timezones";

export interface LoadedSessionPreferences {
  defaultCurrency: string;
  reportingTimezone: string;
}

export interface UseSessionsParams {
  searchQuery: string;
  sortField: SessionSortField;
  dateRange: SessionDateRangePreset;
  pageSize?: number;
}

export interface UseSessionsResult {
  sessions: SessionListItem[];
  totalCount: number;
  defaultCurrency: string;
  reportingTimezone: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
}

export interface UseSessionsPaginationParams {
  searchQuery: string;
  sortField: SessionSortField;
  dateRange: SessionDateRangePreset;
  pageSize: number;
}

export interface UseSessionsPaginationResult {
  sessions: SessionListItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
}
