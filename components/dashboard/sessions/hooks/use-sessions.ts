"use client";

import type { UseSessionsParams, UseSessionsResult } from "@/components/dashboard/sessions/models";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { useSessionsPagination } from "./use-sessions-pagination";

const DEFAULT_PAGE_SIZE = 25;

export function useSessions({
  searchQuery,
  sortField,
  dateRange,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseSessionsParams): UseSessionsResult {
  const { data: preferences } = usePreferences();

  const sessionPagination = useSessionsPagination({
    searchQuery,
    sortField,
    dateRange,
    pageSize,
  });

  return {
    sessions: sessionPagination.sessions,
    totalCount: sessionPagination.totalCount,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    reportingTimezone: preferences?.reportingTimezone ?? getDefaultReportingTimezone(),
    isLoading: sessionPagination.isLoading,
    isLoadingMore: sessionPagination.isLoadingMore,
    hasNextPage: sessionPagination.hasNextPage,
    error: sessionPagination.error,
    refetch: sessionPagination.refetch,
    loadMore: sessionPagination.loadMore,
  };
}
