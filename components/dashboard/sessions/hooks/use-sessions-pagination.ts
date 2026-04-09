"use client";

import { mapSessionRowsToListItems } from "@/components/dashboard/sessions/utils/session-formatting";
import type {
  SessionListItem,
  SessionSortField,
} from "@/components/dashboard/sessions/utils/session-listing";
import { fetchSessionsPage } from "@/lib/sessions/fetch-sessions-page";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseSessionsPaginationParams {
  searchQuery: string;
  sortField: SessionSortField;
  dateRange: SessionDateRangePreset;
  pageSize: number;
  ensureSessionPreferencesLoaded: () => Promise<{
    userId: string;
    reportingTimezone: string;
  }>;
  getCurrentReportingTimezone: () => string;
}

interface UseSessionsPaginationResult {
  sessions: SessionListItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

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
  const userIdRef = useRef<string | null>(null);

  const loadPage = useCallback(
    async ({
      pageIndex,
      append,
      reportingTimezoneOverride,
      userIdOverride,
    }: {
      pageIndex: number;
      append: boolean;
      reportingTimezoneOverride?: string;
      userIdOverride?: string;
    }) => {
      const currentRequestId = ++requestIdRef.current;
      const supabase = createClient();
      const effectiveUserId = userIdOverride ?? userIdRef.current;
      if (!effectiveUserId) {
        throw new Error("You must be signed in to view sessions.");
      }

      const effectiveReportingTimezone =
        reportingTimezoneOverride ?? getCurrentReportingTimezone();
      const pageResult = await fetchSessionsPage({
        supabase,
        userId: effectiveUserId,
        reportingTimezone: effectiveReportingTimezone,
        searchQuery,
        sortField,
        dateRange,
        pageIndex,
        pageSize,
      });

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
      userIdRef.current = sessionPreferences.userId;
      await loadPage({
        pageIndex: 0,
        append: false,
        reportingTimezoneOverride: sessionPreferences.reportingTimezone,
        userIdOverride: sessionPreferences.userId,
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
