"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UseSessionsParams, UseSessionsResult } from "@/components/dashboard/sessions/models";
import {
  fetchPreferences,
  PREFERENCES_QUERY_KEY,
  usePreferences,
  type PreferencesData,
} from "@/lib/preferences/use-preferences";
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
  const queryClient = useQueryClient();

  const ensureSessionPreferencesLoaded = useCallback(async (): Promise<PreferencesData> => {
    return queryClient.ensureQueryData({
      queryKey: PREFERENCES_QUERY_KEY,
      queryFn: fetchPreferences,
      staleTime: Infinity,
    });
  }, [queryClient]);

  const getCurrentReportingTimezone = useCallback((): string => {
    const cached = queryClient.getQueryData<PreferencesData>(PREFERENCES_QUERY_KEY);
    return cached?.reportingTimezone ?? getDefaultReportingTimezone();
  }, [queryClient]);

  const sessionPagination = useSessionsPagination({
    searchQuery,
    sortField,
    dateRange,
    pageSize,
    ensureSessionPreferencesLoaded,
    getCurrentReportingTimezone,
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
    reload: sessionPagination.reload,
    loadMore: sessionPagination.loadMore,
  };
}
