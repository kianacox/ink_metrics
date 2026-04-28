import type { SessionListItem, SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
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
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface UseSessionsPaginationParams {
  searchQuery: string;
  sortField: SessionSortField;
  dateRange: SessionDateRangePreset;
  pageSize: number;
  ensureSessionPreferencesLoaded: () => Promise<
    Pick<LoadedSessionPreferences, "reportingTimezone">
  >;
  getCurrentReportingTimezone: () => string;
}

export interface UseSessionsPaginationResult {
  sessions: SessionListItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}
