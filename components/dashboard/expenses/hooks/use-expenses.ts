"use client";

import type { ExpenseListItem } from "@/lib/expenses/models";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseExpensesParams {
  selectedCategories: string[];
  pageSize?: number;
}

interface UseExpensesResult {
  expenses: ExpenseListItem[];
  totalCount: number;
  currentMonthTotalMinor: number;
  defaultCurrency: string;
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

interface ExpensesApiResponse {
  expenses: ExpenseListItem[];
  totalCount: number;
  hasNextPage: boolean;
  currentMonthTotalMinor: number;
}

const DEFAULT_PAGE_SIZE = 25;

export function useExpenses({
  selectedCategories,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseExpensesParams): UseExpensesResult {
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentMonthTotalMinor, setCurrentMonthTotalMinor] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const requestIdRef = useRef(0);
  const didLoadProfileRef = useRef(false);
  const defaultCurrencyRef = useRef(DEFAULT_CURRENCY);

  const loadPreferences = useCallback(async () => {
    if (didLoadProfileRef.current) {
      return { defaultCurrency: defaultCurrencyRef.current };
    }

    const res = await fetch("/api/preferences");
    if (!res.ok) {
      throw new Error("Could not load preferences.");
    }

    const data = (await res.json()) as PreferencesApiResponse;
    const nextCurrency = data.defaultCurrency ?? DEFAULT_CURRENCY;

    setDefaultCurrency(nextCurrency);
    defaultCurrencyRef.current = nextCurrency;
    didLoadProfileRef.current = true;

    return { defaultCurrency: nextCurrency };
  }, []);

  const loadPage = useCallback(
    async ({ pageIndex, append }: { pageIndex: number; append: boolean }) => {
      const currentRequestId = ++requestIdRef.current;

      const params = new URLSearchParams({
        page: String(pageIndex),
        pageSize: String(pageSize),
      });

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
      setExpenses((prev) => (append ? [...prev, ...data.expenses] : data.expenses));
      setTotalCount(data.totalCount);
      setHasNextPage(data.hasNextPage);
      setCurrentPageIndex(pageIndex);
      // Always reflect the latest month total from page 0 responses
      if (!append) {
        setCurrentMonthTotalMinor(data.currentMonthTotalMinor ?? 0);
      }
    },
    [pageSize, selectedCategories],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadPreferences();
      await loadPage({ pageIndex: 0, append: false });
    } catch {
      setError("Could not load expenses. Please try again.");
      setExpenses([]);
      setTotalCount(0);
      setCurrentMonthTotalMinor(0);
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
      setError("Could not load more expenses. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPageIndex, hasNextPage, isLoading, isLoadingMore, loadPage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    expenses,
    totalCount,
    currentMonthTotalMinor,
    defaultCurrency,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  };
}
