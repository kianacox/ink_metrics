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
  defaultCurrency: string;
  reportingTimezone: string;
  topClientThisMonth: ClientListItem | null;
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
  data: ClientListItem[];
  nextCursor: string | null;
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
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [reportingTimezone, setReportingTimezone] = useState(getDefaultReportingTimezone());
  const [topClientThisMonth, setTopClientThisMonth] = useState<ClientListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      cursor,
      append,
      reportingTimezoneOverride,
    }: {
      cursor: string | null;
      append: boolean;
      reportingTimezoneOverride?: string;
    }) => {
      const currentRequestId = ++requestIdRef.current;
      const effectiveTimezone = reportingTimezoneOverride ?? reportingTimezoneRef.current;

      const params = new URLSearchParams({
        search: searchQuery,
        sort: sortField,
        dateRange,
        limit: String(pageSize),
        tz: effectiveTimezone,
      });
      if (cursor) {
        params.set("cursor", cursor);
      }

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not load clients.");
      }

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const data = (await res.json()) as ClientsApiResponse;
      setClients((prev) => (append ? [...prev, ...data.data] : data.data));
      setHasNextPage(data.hasNextPage);
      setNextCursor(data.nextCursor);
    },
    [dateRange, pageSize, searchQuery, sortField],
  );

  const loadTopClientThisMonth = useCallback(async (tz: string) => {
    const params = new URLSearchParams({
      dateRange: "thisMonth",
      sort: "total_value",
      limit: "1",
      search: "",
      tz,
    });
    const res = await fetch(`/api/clients?${params.toString()}`);
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as ClientsApiResponse;
    setTopClientThisMonth(data.data[0] ?? null);
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prefs = await loadPreferences();
      await Promise.all([
        loadPage({
          cursor: null,
          append: false,
          reportingTimezoneOverride: prefs.reportingTimezone,
        }),
        loadTopClientThisMonth(prefs.reportingTimezone),
      ]);
    } catch (loadError) {
      setError(
        loadError instanceof Error &&
          loadError.message === "Could not compute date range boundaries."
          ? "Could not load clients for the selected reporting timezone. Please check your profile timezone and try again."
          : "Could not load clients. Please try again.",
      );
      setClients([]);
      setHasNextPage(false);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadPage, loadPreferences, loadTopClientThisMonth]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasNextPage) {
      return;
    }
    setIsLoadingMore(true);
    setError(null);
    try {
      await loadPage({ cursor: nextCursor, append: true });
    } catch {
      setError("Could not load more clients. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNextPage, isLoading, isLoadingMore, loadPage, nextCursor]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    clients,
    defaultCurrency,
    reportingTimezone,
    topClientThisMonth,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  };
}
