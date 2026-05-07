"use client";

import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";

/**
 * Standard cursor-paginated API page shape used across feature endpoints.
 * Pages may carry additional, domain-specific metadata (e.g. a window total),
 * so the page type is exposed as a generic for callers that need to read it.
 */
export interface InfiniteApiPage<TItem> {
  data: TItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface UseInfiniteApiQueryOptions<TParams> {
  /** TanStack Query cache key. Should encode the same inputs as `params`. */
  queryKey: QueryKey;
  /** Absolute API path, e.g. `/api/clients`. */
  endpoint: string;
  /** Current filter / sort state. Used by `buildSearchParams`. */
  params: TParams;
  /** Build the URLSearchParams for a request. The cursor is undefined for the first page. */
  buildSearchParams: (params: TParams, cursor?: string) => URLSearchParams;
  /** When false, no request is fired. Defaults to true. */
  enabled?: boolean;
  /** Fallback error message if the response body has no `error` field. */
  defaultErrorMessage?: string;
  /**
   * Transform the raw thrown error message (from the response body or fetch error)
   * into a user-facing string before it is surfaced as `error`.
   */
  mapError?: (message: string) => string;
}

export interface UseInfiniteApiQueryResult<
  TItem,
  TPage extends InfiniteApiPage<TItem> = InfiniteApiPage<TItem>,
> {
  /** Flattened items across all loaded pages. */
  items: TItem[];
  /** Raw page objects, in order. Useful for reading per-page metadata. */
  pages: TPage[];
  /** True while the first page is loading. */
  isLoading: boolean;
  /** True while a subsequent page is loading. */
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  refetch: () => void;
  loadMore: () => void;
}

const DEFAULT_ERROR_MESSAGE = "Request failed.";

async function fetchPage<TPage>(
  endpoint: string,
  searchParams: URLSearchParams,
  defaultErrorMessage: string,
): Promise<TPage> {
  const res = await fetch(`${endpoint}?${searchParams.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? defaultErrorMessage);
  }
  return (await res.json()) as TPage;
}

/**
 * Generic cursor-paginated fetch hook used by feature hooks (clients, sessions,
 * expenses, etc.). Centralises fetch + pagination + error normalisation so
 * feature hooks become thin param builders.
 */
export function useInfiniteApiQuery<
  TItem,
  TParams,
  TPage extends InfiniteApiPage<TItem> = InfiniteApiPage<TItem>,
>(
  options: UseInfiniteApiQueryOptions<TParams>,
): UseInfiniteApiQueryResult<TItem, TPage> {
  const {
    queryKey,
    endpoint,
    params,
    buildSearchParams,
    enabled = true,
    defaultErrorMessage = DEFAULT_ERROR_MESSAGE,
    mapError,
  } = options;

  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    error: queryError,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery<TPage, Error>({
    queryKey,
    queryFn: ({ pageParam }) => {
      const cursor = (pageParam as string | null) ?? undefined;
      const searchParams = buildSearchParams(params, cursor);
      return fetchPage<TPage>(endpoint, searchParams, defaultErrorMessage);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled,
  });

  const pages = (data?.pages ?? []) as TPage[];
  const items = pages.flatMap((page) => page.data);

  const isLoading = isFetching && !isFetchingNextPage;
  const isLoadingMore = isFetchingNextPage;

  let error: string | null = null;
  if (queryError) {
    const message = queryError instanceof Error ? queryError.message : "";
    error = mapError ? mapError(message) : message || defaultErrorMessage;
  }

  const loadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      void fetchNextPage();
    }
  };

  return {
    items,
    pages,
    isLoading,
    isLoadingMore,
    hasNextPage: hasNextPage ?? false,
    error,
    refetch: () => void refetch(),
    loadMore,
  };
}
