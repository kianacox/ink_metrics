"use client";

import type { SessionListItem, SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import { type SessionDateRangePreset } from "@/lib/timezones";
import { useSessionPreferences } from "./use-session-preferences";
import { useSessionsPagination } from "./use-sessions-pagination";

const DEFAULT_PAGE_SIZE = 25;

export interface UseSessionsParams {
  searchQuery: string;
  sortField: SessionSortField;
  dateRange: SessionDateRangePreset;
  pageSize?: number;
}

interface UseSessionsResult {
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

export function useSessions({
  searchQuery,
  sortField,
  dateRange,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseSessionsParams): UseSessionsResult {
  const sessionPreferences = useSessionPreferences();
  const sessionPagination = useSessionsPagination({
    searchQuery,
    sortField,
    dateRange,
    pageSize,
    ensureSessionPreferencesLoaded: sessionPreferences.ensureLoaded,
    getCurrentReportingTimezone: sessionPreferences.getCurrentReportingTimezone,
  });

  return {
    sessions: sessionPagination.sessions,
    totalCount: sessionPagination.totalCount,
    defaultCurrency: sessionPreferences.defaultCurrency,
    reportingTimezone: sessionPreferences.reportingTimezone,
    isLoading: sessionPagination.isLoading,
    isLoadingMore: sessionPagination.isLoadingMore,
    hasNextPage: sessionPagination.hasNextPage,
    error: sessionPagination.error,
    reload: sessionPagination.reload,
    loadMore: sessionPagination.loadMore,
  };
}
