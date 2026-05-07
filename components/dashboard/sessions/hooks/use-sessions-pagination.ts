"use client";

import { mapSessionRowsToListItems } from "@/components/dashboard/sessions/utils/session-formatting";
import { useInfiniteApiQuery } from "@/components/shared/hooks/use-infinite-api-query";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import type {
  UseSessionsPaginationParams,
  UseSessionsPaginationResult,
} from "@/components/dashboard/sessions/models";
import type { SessionRow, SessionSortField } from "@/lib/sessions/models";
import type { SessionDateRangePreset } from "@/lib/timezones";

interface SessionsQueryParams {
  searchQuery: string;
  sortField: SessionSortField;
  dateRange: SessionDateRangePreset;
  pageSize: number;
  reportingTimezone: string;
}

const TIMEZONE_BOUNDARY_ERROR = "Could not compute date range boundaries.";
const TIMEZONE_BOUNDARY_USER_MESSAGE =
  "Could not load sessions for the selected reporting timezone. Please check your profile timezone and try again.";
const GENERIC_USER_MESSAGE = "Could not load sessions. Please try again.";
const DEFAULT_ERROR_MESSAGE = "Could not load sessions.";

function buildSessionsSearchParams(
  params: SessionsQueryParams,
  cursor?: string,
): URLSearchParams {
  const search = new URLSearchParams({
    search: params.searchQuery,
    sort: params.sortField,
    dateRange: params.dateRange,
    limit: String(params.pageSize),
    tz: params.reportingTimezone,
  });
  if (cursor) {
    search.set("cursor", cursor);
  }
  return search;
}

function mapSessionsError(message: string): string {
  if (message === TIMEZONE_BOUNDARY_ERROR) {
    return TIMEZONE_BOUNDARY_USER_MESSAGE;
  }
  return GENERIC_USER_MESSAGE;
}

export function useSessionsPagination({
  searchQuery,
  sortField,
  dateRange,
  pageSize,
}: UseSessionsPaginationParams): UseSessionsPaginationResult {
  const { data: preferences, isLoading: isPreferencesLoading } = usePreferences();
  const reportingTimezone = preferences?.reportingTimezone ?? getDefaultReportingTimezone();

  const queryParams: SessionsQueryParams = {
    searchQuery,
    sortField,
    dateRange,
    pageSize,
    reportingTimezone,
  };

  const {
    items: sessionRows,
    isLoading: isQueryLoading,
    isLoadingMore,
    hasNextPage,
    error,
    refetch,
    loadMore,
  } = useInfiniteApiQuery<SessionRow, SessionsQueryParams>({
    queryKey: ["sessions", { searchQuery, sortField, dateRange, pageSize }],
    endpoint: "/api/sessions",
    params: queryParams,
    buildSearchParams: buildSessionsSearchParams,
    enabled: !!preferences,
    defaultErrorMessage: DEFAULT_ERROR_MESSAGE,
    mapError: mapSessionsError,
  });

  const sessions = mapSessionRowsToListItems(sessionRows);

  return {
    sessions,
    totalCount: sessions.length,
    isLoading: isPreferencesLoading || isQueryLoading,
    isLoadingMore,
    hasNextPage,
    error,
    refetch,
    loadMore,
  };
}
