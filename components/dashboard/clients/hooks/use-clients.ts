"use client";

import type { ClientListItem, ClientSortField } from "@/lib/clients/models";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences } from "@/lib/preferences/use-preferences";

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
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
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
  const { data: preferences } = usePreferences();

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const reportingTimezoneRef = useRef(getDefaultReportingTimezone());

  useEffect(() => {
    if (preferences?.reportingTimezone) {
      reportingTimezoneRef.current = preferences.reportingTimezone;
    }
  }, [preferences?.reportingTimezone]);

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

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadPage({
        cursor: null,
        append: false,
        reportingTimezoneOverride: preferences?.reportingTimezone,
      });
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
  }, [loadPage, preferences?.reportingTimezone]);

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
    if (!preferences) return;
    void reload();
  }, [reload, preferences]);

  return {
    clients,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    reportingTimezone: preferences?.reportingTimezone ?? getDefaultReportingTimezone(),
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  };
}
