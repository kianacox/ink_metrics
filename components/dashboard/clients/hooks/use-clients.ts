"use client";

import { fetchClientsPage } from "@/lib/clients/fetch-clients-page";
import type { ClientListItem, ClientSortField } from "@/lib/clients/models";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import {
  getDefaultReportingTimezone,
  getEffectiveReportingTimezone,
} from "@/lib/timezones";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseClientsParams {
  searchQuery: string;
  sortField: ClientSortField;
  dateRange: SessionDateRangePreset;
  pageSize?: number;
}

interface UseClientsResult {
  clients: ClientListItem[];
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

const DEFAULT_PAGE_SIZE = 25;

export function useClients({
  searchQuery,
  sortField,
  dateRange,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseClientsParams): UseClientsResult {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [reportingTimezone, setReportingTimezone] = useState(
    getDefaultReportingTimezone(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const requestIdRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const reportingTimezoneRef = useRef(getDefaultReportingTimezone());
  const didLoadProfileRef = useRef(false);

  const loadPreferences = useCallback(async () => {
    const supabase = createClient();

    if (!userIdRef.current) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("You must be signed in to view clients.");
      }
      userIdRef.current = user.id;
    }

    if (didLoadProfileRef.current) {
      return {
        userId: userIdRef.current,
        reportingTimezone: reportingTimezoneRef.current,
        defaultCurrency: defaultCurrency,
      };
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("default_currency,reporting_timezone")
      .eq("user_id", userIdRef.current)
      .limit(1);

    if (!profileError) {
      const nextCurrency = profileRows?.[0]?.default_currency ?? DEFAULT_CURRENCY;
      const nextTimezone = getEffectiveReportingTimezone(
        profileRows?.[0]?.reporting_timezone,
      );
      setDefaultCurrency(nextCurrency);
      setReportingTimezone(nextTimezone);
      reportingTimezoneRef.current = nextTimezone;
      didLoadProfileRef.current = true;
    }

    return {
      userId: userIdRef.current,
      reportingTimezone: reportingTimezoneRef.current,
      defaultCurrency: defaultCurrency,
    };
  }, [defaultCurrency]);

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
        throw new Error("You must be signed in to view clients.");
      }
      const effectiveTimezone =
        reportingTimezoneOverride ?? reportingTimezoneRef.current;

      const pageResult = await fetchClientsPage({
        supabase,
        userId: effectiveUserId,
        reportingTimezone: effectiveTimezone,
        searchQuery,
        sortField,
        dateRange,
        pageIndex,
        pageSize,
      });

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setClients((prev) => (append ? [...prev, ...pageResult.rows] : pageResult.rows));
      setTotalCount(pageResult.totalCount);
      setHasNextPage(pageResult.hasNextPage);
      setCurrentPageIndex(pageIndex);
    },
    [dateRange, pageSize, searchQuery, sortField],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prefs = await loadPreferences();
      await loadPage({
        pageIndex: 0,
        append: false,
        reportingTimezoneOverride: prefs.reportingTimezone,
        userIdOverride: prefs.userId,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error &&
          loadError.message === "Could not compute date range boundaries."
          ? "Could not load clients for the selected reporting timezone. Please check your profile timezone and try again."
          : "Could not load clients. Please try again.",
      );
      setClients([]);
      setTotalCount(0);
      setHasNextPage(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadPage, loadPreferences]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasNextPage) {
      return;
    }
    setIsLoadingMore(true);
    setError(null);
    try {
      await loadPage({ pageIndex: currentPageIndex + 1, append: true });
    } catch {
      setError("Could not load more clients. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPageIndex, hasNextPage, isLoading, isLoadingMore, loadPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    clients,
    totalCount,
    defaultCurrency,
    reportingTimezone,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  };
}
