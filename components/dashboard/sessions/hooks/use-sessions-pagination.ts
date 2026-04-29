"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { mapSessionRowsToListItems } from "@/components/dashboard/sessions/utils/session-formatting";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import type {
  UseSessionsPaginationParams,
  UseSessionsPaginationResult,
} from "@/components/dashboard/sessions/models";
import type { FetchSessionsPageResult } from "@/lib/sessions/models";

async function fetchSessionsPage(
  pageParam: string | null,
  searchQuery: string,
  sortField: string,
  dateRange: string,
  pageSize: number,
  reportingTimezone: string,
): Promise<FetchSessionsPageResult> {
  const params = new URLSearchParams({
    search: searchQuery,
    sort: sortField,
    dateRange,
    limit: String(pageSize),
    tz: reportingTimezone,
  });
  if (pageParam) {
    params.set("cursor", pageParam);
  }
  const res = await fetch(`/api/sessions?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Could not load sessions.");
  }
  return (await res.json()) as FetchSessionsPageResult;
}

export function useSessionsPagination({
  searchQuery,
  sortField,
  dateRange,
  pageSize,
}: UseSessionsPaginationParams): UseSessionsPaginationResult {
  const { data: preferences, isLoading: isPreferencesLoading } = usePreferences();
  const reportingTimezone = preferences?.reportingTimezone ?? getDefaultReportingTimezone();

  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage: infiniteHasNextPage,
    error: queryError,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["sessions", { searchQuery, sortField, dateRange, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchSessionsPage(pageParam, searchQuery, sortField, dateRange, pageSize, reportingTimezone),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: !!preferences,
  });

  const sessions = data?.pages.flatMap((page) => mapSessionRowsToListItems(page.data)) ?? [];
  const totalCount = sessions.length;

  const isLoading = isPreferencesLoading || (isFetching && !isFetchingNextPage);
  const isLoadingMore = isFetchingNextPage;

  let error: string | null = null;
  if (queryError) {
    const message = queryError instanceof Error ? queryError.message : "";
    error =
      message === "Could not compute date range boundaries."
        ? "Could not load sessions for the selected reporting timezone. Please check your profile timezone and try again."
        : "Could not load sessions. Please try again.";
  }

  const loadMore = () => {
    if (!isFetchingNextPage && infiniteHasNextPage) {
      void fetchNextPage();
    }
  };

  return {
    sessions,
    totalCount,
    isLoading,
    isLoadingMore,
    hasNextPage: infiniteHasNextPage ?? false,
    error,
    refetch: () => void refetch(),
    loadMore,
  };
}
