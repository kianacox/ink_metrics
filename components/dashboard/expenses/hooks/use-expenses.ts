"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { ExpensesApiResponse, UseExpensesParams, UseExpensesResult } from "@/lib/expenses/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { usePreferences } from "@/lib/preferences/use-preferences";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";

async function fetchExpensesPage(
  pageParam: string | null,
  selectedCategories: string[],
  dateRange: SessionDateRangePreset,
  pageSize: number,
  reportingTimezone: string,
): Promise<ExpensesApiResponse> {
  const params = new URLSearchParams({
    limit: String(pageSize),
    dateRange,
    tz: reportingTimezone,
  });
  if (pageParam) {
    params.set("cursor", pageParam);
  }
  for (const category of selectedCategories) {
    params.append("category", category);
  }
  const res = await fetch(`/api/expenses?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Could not load expenses.");
  }
  return (await res.json()) as ExpensesApiResponse;
}

export function useExpenses({
  selectedCategories,
  dateRange = DEFAULT_DATE_RANGE,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseExpensesParams): UseExpensesResult {
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
    queryKey: ["expenses", { selectedCategories, dateRange, pageSize }],
    queryFn: ({ pageParam }) =>
      fetchExpensesPage(pageParam, selectedCategories, dateRange, pageSize, reportingTimezone),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: !!preferences,
  });

  const expenses = data?.pages.flatMap((page) => page.data) ?? [];
  const rangeTotalMinor = data?.pages[0]?.rangeTotalMinor ?? 0;

  const isLoading = isPreferencesLoading || (isFetching && !isFetchingNextPage);
  const isLoadingMore = isFetchingNextPage;

  let error: string | null = null;
  if (queryError) {
    const message = queryError instanceof Error ? queryError.message : "";
    error = message || "Could not load expenses. Please try again.";
  }

  const loadMore = () => {
    if (!isFetchingNextPage && infiniteHasNextPage) {
      void fetchNextPage();
    }
  };

  return {
    expenses,
    rangeTotalMinor,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    isLoading,
    isLoadingMore,
    hasNextPage: infiniteHasNextPage ?? false,
    error,
    refetch: () => void refetch(),
    loadMore,
  };
}
