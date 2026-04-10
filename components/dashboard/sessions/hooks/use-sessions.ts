"use client";

import type {
  UseSessionsParams,
  UseSessionsResult,
} from "@/components/dashboard/sessions/models";
import { useSessionPreferences } from "./use-session-preferences";
import { useSessionsPagination } from "./use-sessions-pagination";

const DEFAULT_PAGE_SIZE = 25;

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
