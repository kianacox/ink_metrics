"use client";

import type { ClientListItem, ClientSortField } from "@/lib/clients/models";
import type { ClientTier } from "@/lib/clients/tier";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { useInfiniteApiQuery } from "@/components/shared/hooks/use-infinite-api-query";

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

interface ClientsQueryParams {
  searchQuery: string;
  sortField: ClientSortField;
  dateRange: SessionDateRangePreset;
  tier: ClientTier | null;
  pageSize: number;
  reportingTimezone: string;
}

const DEFAULT_PAGE_SIZE = 25;
const TIMEZONE_BOUNDARY_ERROR = "Could not compute date range boundaries.";
const TIMEZONE_BOUNDARY_USER_MESSAGE =
  "Could not load clients for the selected reporting timezone. Please check your profile timezone and try again.";
const GENERIC_USER_MESSAGE = "Could not load clients. Please try again.";
const DEFAULT_ERROR_MESSAGE = "Could not load clients.";

function buildClientsSearchParams(
  params: ClientsQueryParams,
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
  if (params.tier) {
    search.set("tier", params.tier);
  }
  return search;
}

function mapClientsError(message: string): string {
  if (message === TIMEZONE_BOUNDARY_ERROR) {
    return TIMEZONE_BOUNDARY_USER_MESSAGE;
  }
  return GENERIC_USER_MESSAGE;
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

  const queryParams: ClientsQueryParams = {
    searchQuery,
    sortField,
    dateRange,
    tier,
    pageSize,
    reportingTimezone,
  };

  const {
    items: clients,
    isLoading: isQueryLoading,
    isLoadingMore,
    hasNextPage,
    error,
    refetch,
    loadMore,
  } = useInfiniteApiQuery<ClientListItem, ClientsQueryParams>({
    queryKey: ["clients", { searchQuery, sortField, dateRange, tier, pageSize }],
    endpoint: "/api/clients",
    params: queryParams,
    buildSearchParams: buildClientsSearchParams,
    enabled: !!preferences,
    defaultErrorMessage: DEFAULT_ERROR_MESSAGE,
    mapError: mapClientsError,
  });

  return {
    clients,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    reportingTimezone,
    isLoading: isPreferencesLoading || isQueryLoading,
    isLoadingMore,
    hasNextPage,
    error,
    refetch,
    loadMore,
  };
}
