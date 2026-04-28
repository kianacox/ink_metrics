"use client";

import type {
  ExpensesApiResponse,
  UseExpensesParams,
  UseExpensesResult,
} from "@/lib/expenses/models";
import type { ExpenseListItem } from "@/lib/expenses/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences } from "@/lib/preferences/use-preferences";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";

export function useExpenses({
  selectedCategories,
  dateRange = DEFAULT_DATE_RANGE,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseExpensesParams): UseExpensesResult {
  const { data: preferences } = usePreferences();

  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [rangeTotalMinor, setRangeTotalMinor] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const reportingTimezoneRef = useRef("UTC");

  useEffect(() => {
    if (preferences?.reportingTimezone) {
      reportingTimezoneRef.current = preferences.reportingTimezone;
    }
  }, [preferences?.reportingTimezone]);

  const loadPage = useCallback(
    async ({ cursor, append }: { cursor: string | null; append: boolean }) => {
      const currentRequestId = ++requestIdRef.current;

      const params = new URLSearchParams({
        limit: String(pageSize),
        dateRange,
        tz: reportingTimezoneRef.current,
      });
      if (cursor) {
        params.set("cursor", cursor);
      }

      for (const category of selectedCategories) {
        params.append("category", category);
      }

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not load expenses.");
      }

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const data = (await res.json()) as ExpensesApiResponse;
      setExpenses((prev) => (append ? [...prev, ...data.data] : data.data));
      setHasNextPage(data.hasNextPage);
      setNextCursor(data.nextCursor);
      if (!append) {
        setRangeTotalMinor(data.rangeTotalMinor ?? 0);
      }
    },
    [pageSize, dateRange, selectedCategories],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadPage({ cursor: null, append: false });
    } catch {
      setError("Could not load expenses. Please try again.");
      setExpenses([]);
      setRangeTotalMinor(0);
      setHasNextPage(false);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasNextPage) {
      return;
    }
    setIsLoadingMore(true);
    setError(null);
    try {
      await loadPage({ cursor: nextCursor, append: true });
    } catch {
      setError("Could not load more expenses. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNextPage, isLoading, isLoadingMore, loadPage, nextCursor]);

  useEffect(() => {
    if (!preferences) return;
    void reload();
  }, [reload, preferences]);

  return {
    expenses,
    rangeTotalMinor,
    defaultCurrency: preferences?.defaultCurrency ?? DEFAULT_CURRENCY,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  };
}
