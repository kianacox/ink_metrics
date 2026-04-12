"use client";

import type { ClientListItem, ClientSortField } from "@/lib/clients/models";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
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

interface PreferencesApiResponse {
  defaultCurrency: string;
  reportingTimezone: string;
}

interface ClientsApiResponse {
  clients: ClientListItem[];
  totalCount: number;
  hasNextPage: boolean;
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
  const [reportingTimezone, setReportingTimezone] = useState(getDefaultReportingTimezone());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const requestIdRef = useRef(0);
  const reportingTimezoneRef = useRef(getDefaultReportingTimezone());
  const didLoadProfileRef = useRef(false);
  const defaultCurrencyRef = useRef(DEFAULT_CURRENCY);

  const loadPreferences = useCallback(async () => {
    if (didLoadProfileRef.current) {
      return {
        reportingTimezone: reportingTimezoneRef.current,
        defaultCurrency: defaultCurrencyRef.current,
      };
    }

    const res = await fetch("/api/preferences");
    if (!res.ok) {
      throw new Error("Could not load preferences.");
    }

    const data = (await res.json()) as PreferencesApiResponse;
    const nextCurrency = data.defaultCurrency ?? DEFAULT_CURRENCY;
    const nextTimezone = data.reportingTimezone ?? getDefaultReportingTimezone();

    setDefaultCurrency(nextCurrency);
    setReportingTimezone(nextTimezone);
    defaultCurrencyRef.current = nextCurrency;
    reportingTimezoneRef.current = nextTimezone;
    didLoadProfileRef.current = true;

    return { reportingTimezone: nextTimezone, defaultCurrency: nextCurrency };
  }, []);

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
      const effectiveTimezone = reportingTimezoneOverride ?? reportingTimezoneRef.current;

      const params = new URLSearchParams({
        search: searchQuery,
        sort: sortField,
        dateRange,
        page: String(pageIndex),
        pageSize: String(pageSize),
        tz: effectiveTimezone,
      });

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not load clients.");
      }

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const data = (await res.json()) as ClientsApiResponse;
      setClients((prev) => (append ? [...prev, ...data.clients] : data.clients));
      setTotalCount(data.totalCount);
      setHasNextPage(data.hasNextPage);
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
