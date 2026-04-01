"use client";

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  mapSessionRowsToListItems,
} from "@/components/dashboard/sessions/utils/session-formatting";
import type {
  SessionListItem,
  SessionSortField,
} from "@/components/dashboard/sessions/utils/session-listing";
import {
  fetchSessionsPage,
  type SessionDateRangePreset,
} from "@/lib/sessions/fetch-sessions-page";

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
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const requestIdRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const didLoadCurrencyRef = useRef(false);

  const getUserId = useCallback(async () => {
    if (userIdRef.current) {
      return userIdRef.current;
    }
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be signed in to view sessions.");
    }

    userIdRef.current = user.id;
    return user.id;
  }, []);

  const loadCurrency = useCallback(async () => {
    if (didLoadCurrencyRef.current) {
      return;
    }

    const supabase = createClient();
    const userId = await getUserId();
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("default_currency")
      .eq("user_id", userId)
      .limit(1);

    if (!profileError) {
      setDefaultCurrency(profileRows?.[0]?.default_currency ?? DEFAULT_CURRENCY);
      didLoadCurrencyRef.current = true;
    }
  }, [getUserId]);

  const loadPage = useCallback(
    async ({ pageIndex, append }: { pageIndex: number; append: boolean }) => {
      const currentRequestId = ++requestIdRef.current;
      const supabase = createClient();
      const userId = await getUserId();
      const pageResult = await fetchSessionsPage({
        supabase,
        userId,
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
    [dateRange, getUserId, pageSize, searchQuery, sortField],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadPage({ pageIndex: 0, append: false }),
        loadCurrency(),
      ]);
    } catch {
      setError("Could not load sessions. Please try again.");
      setSessions([]);
      setTotalCount(0);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadCurrency, loadPage]);

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
    void load();
  }, [load]);

  return {
    sessions,
    totalCount,
    defaultCurrency,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload: load,
    loadMore,
  };
}
