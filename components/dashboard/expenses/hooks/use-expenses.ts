"use client";

import type {
  ExpenseListItem,
  ExpensesApiResponse,
  UseExpensesParams,
  UseExpensesResult,
} from "@/lib/expenses/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { useInfiniteApiQuery } from "@/components/shared/hooks/use-infinite-api-query";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";
const DEFAULT_ERROR_MESSAGE = "Could not load expenses.";
const FALLBACK_USER_MESSAGE = "Could not load expenses. Please try again.";

interface ExpensesQueryParams {
  selectedCategories: string[];
  dateRange: SessionDateRangePreset;
  pageSize: number;
  reportingTimezone: string;
}

function buildExpensesSearchParams(
  params: ExpensesQueryParams,
  cursor?: string,
): URLSearchParams {
  const search = new URLSearchParams({
    limit: String(params.pageSize),
    dateRange: params.dateRange,
    tz: params.reportingTimezone,
  });
  if (cursor) {
    search.set("cursor", cursor);
  }
  for (const category of params.selectedCategories) {
    search.append("category", category);
  }
  return search;
}

function mapExpensesError(message: string): string {
  return message || FALLBACK_USER_MESSAGE;
}

export function useExpenses({
  selectedCategories,
  dateRange = DEFAULT_DATE_RANGE,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseExpensesParams): UseExpensesResult {
  const { data: preferences, isLoading: isPreferencesLoading } = usePreferences();
  const reportingTimezone = preferences?.reportingTimezone ?? getDefaultReportingTimezone();

  const queryParams: ExpensesQueryParams = {
    selectedCategories,
    dateRange,
    pageSize,
    reportingTimezone,
  };

  const {
    items: expenses,
    pages,
    isLoading: isQueryLoading,
    isLoadingMore,
    hasNextPage,
    error,
    refetch,
    loadMore,
  } = useInfiniteApiQuery<ExpenseListItem, ExpensesQueryParams, ExpensesApiResponse>({
    queryKey: ["expenses", { selectedCategories, dateRange, pageSize }],
    endpoint: "/api/expenses",
    params: queryParams,
    buildSearchParams: buildExpensesSearchParams,
    enabled: !!preferences,
    defaultErrorMessage: DEFAULT_ERROR_MESSAGE,
    mapError: mapExpensesError,
  });

  const rangeTotalMinor = pages[0]?.rangeTotalMinor ?? 0;

  return {
    expenses,
    rangeTotalMinor,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    isLoading: isPreferencesLoading || isQueryLoading,
    isLoadingMore,
    hasNextPage,
    error,
    refetch,
    loadMore,
  };
}
