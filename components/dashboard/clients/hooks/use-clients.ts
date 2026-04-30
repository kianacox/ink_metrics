"use client";

import type { ClientListItem, ClientSortField } from "@/lib/clients/models";
import type { ClientTier } from "@/lib/clients/tier";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { useInfiniteQuery } from "@tanstack/react-query";
import { usePreferences } from "@/lib/preferences/use-preferences";

interface UseClientsParams {
  searchQuery: string;
  sortField: ClientSortField;
  dateRange: SessionDateRangePreset;
  tier: ClientTier | null;
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
  refetch: () => void;
  loadMore: () => void;
}

interface ClientsApiResponse {
  data: ClientListItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

const DEFAULT_PAGE_SIZE = 25;

async function fetchClientsPage(
  pageParam: string | null,
  searchQuery: string,
  sortField: ClientSortField,
  dateRange: SessionDateRangePreset,
  tier: ClientTier | null,
  pageSize: number,
  reportingTimezone: string,
): Promise<ClientsApiResponse> {
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
  if (tier) {
    params.set("tier", tier);
  }

  const res = await fetch(`/api/clients?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Could not load clients.");
  }
  return (await res.json()) as ClientsApiResponse;
}

export function useClients({
  searchQuery,
  sortField,
  dateRange,
  tier,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseClientsParams): UseClientsResult {
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
    queryKey: ["clients", { searchQuery, sortField, dateRange, tier, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchClientsPage(
        pageParam,
        searchQuery,
        sortField,
        dateRange,
        tier,
        pageSize,
        reportingTimezone,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: !!preferences,
  });

  const clients = data?.pages.flatMap((page) => page.data) ?? [];

  const isLoading = isPreferencesLoading || (isFetching && !isFetchingNextPage);
  const isLoadingMore = isFetchingNextPage;

  let error: string | null = null;
  if (queryError) {
    const message = queryError instanceof Error ? queryError.message : "";
    error =
      message === "Could not compute date range boundaries."
        ? "Could not load clients for the selected reporting timezone. Please check your profile timezone and try again."
        : "Could not load clients. Please try again.";
  }

  const loadMore = () => {
    if (!isFetchingNextPage && infiniteHasNextPage) {
      void fetchNextPage();
    }
  };

  return {
    clients,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    reportingTimezone,
    isLoading,
    isLoadingMore,
    hasNextPage: infiniteHasNextPage ?? false,
    error,
    refetch,
    loadMore,
  };
}
