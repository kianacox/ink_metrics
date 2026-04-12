"use client";

import { mapSessionRowsToListItems } from "@/components/dashboard/sessions/utils/session-formatting";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  UseSessionsPaginationParams,
  UseSessionsPaginationResult,
} from "@/components/dashboard/sessions/models";
import type { FetchSessionsPageResult } from "@/lib/sessions/models";

export function useSessionsPagination({
  searchQuery,
  sortField,
  dateRange,
  pageSize,
  ensureSessionPreferencesLoaded,
  getCurrentReportingTimezone,
}: UseSessionsPaginationParams): UseSessionsPaginationResult {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async ({
      pageIndex,
      append,
      reportingTimezoneOverride,
    }: {
      pageIndex: number;
      append: boolean;
      reportingTimezoneOverride?: string;
    }) => {
      const currentRequestId = ++requestIdRef.current;
      const effectiveTimezone = reportingTimezoneOverride ?? getCurrentReportingTimezone();

      const params = new URLSearchParams({
        search: searchQuery,
        sort: sortField,
        dateRange,
        page: String(pageIndex),
        pageSize: String(pageSize),
        tz: effectiveTimezone,
      });

      const res = await fetch(`/api/sessions?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not load sessions.");
      }

      const pageResult = (await res.json()) as FetchSessionsPageResult;

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const mappedPage = mapSessionRowsToListItems(pageResult.rows);
      setSessions((previousSessions) =>
        append ? [...previousSessions, ...mappedPage] : mappedPage,
      );
      setTotalCount(pageResult.totalCount);
      setHasNextPage(pageResult.hasNextPage);
      setCurrentPageIndex(pageIndex);
    },
    [dateRange, getCurrentReportingTimezone, pageSize, searchQuery, sortField],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionPreferences = await ensureSessionPreferencesLoaded();
      await loadPage({
        pageIndex: 0,
        append: false,
        reportingTimezoneOverride: sessionPreferences.reportingTimezone,
      });
    } catch (loadError) {
      const nextErrorMessage =
        loadError instanceof Error &&
        loadError.message === "Could not compute date range boundaries."
          ? "Could not load sessions for the selected reporting timezone. Please check your profile timezone and try again."
          : "Could not load sessions. Please try again.";
      setError(nextErrorMessage);
      setSessions([]);
      setTotalCount(0);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [ensureSessionPreferencesLoaded, loadPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasNextPage) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);
    try {
      await loadPage({ pageIndex: currentPageIndex + 1, append: true });
    } catch {
      setError("Could not load more sessions. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPageIndex, hasNextPage, isLoading, isLoadingMore, loadPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    sessions,
    totalCount,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  };
}
