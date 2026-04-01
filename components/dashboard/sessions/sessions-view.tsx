"use client";

import { useEffect, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "@/components/ui";
import { useSessions } from "@/components/dashboard/sessions/hooks/use-sessions";
import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionDateRangePreset } from "@/lib/sessions/fetch-sessions-page";
import { SessionsCards } from "./sessions-cards";
import { SessionsTable } from "./sessions-table";

const SORT_FIELDS: Array<{ label: string; value: SessionSortField }> = [
  { label: "Date", value: "date" },
  { label: "Duration", value: "duration" },
  { label: "Profit", value: "profit" },
];

const DEFAULT_SORT_FIELD: SessionSortField = "date";
const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";
const SEARCH_DEBOUNCE_DELAY_MS = 300;

const DATE_RANGE_OPTIONS: Array<{ label: string; value: SessionDateRangePreset }> = [
  { label: "Last 30 days", value: "last30Days" },
  { label: "Last 90 days", value: "last90Days" },
  { label: "Year to date", value: "yearToDate" },
  { label: "All time", value: "allTime" },
];

export function SessionsView() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SessionSortField>(DEFAULT_SORT_FIELD);
  const [dateRange, setDateRange] = useState<SessionDateRangePreset>(DEFAULT_DATE_RANGE);
  const {
    sessions,
    defaultCurrency,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  } = useSessions({
    searchQuery,
    sortField,
    dateRange,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, SEARCH_DEBOUNCE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const selectedSortLabel =
    SORT_FIELDS.find((option) => option.value === sortField)?.label ?? "Date";
  const selectedDateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)?.label ?? "Last 90 days";
  const hasSessions = sessions.length > 0;
  const hasFatalError = Boolean(error) && !hasSessions;

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          All sessions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by client and sort by date, session length, or session profit (descending).
        </p>

        <div className="mt-4 grid gap-3 sm:mt-5">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by client name"
            aria-label="Search sessions by client name"
          />
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="default" className="w-fit">
                  Sort by: {selectedSortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SORT_FIELDS.map((fieldOption) => (
                  <DropdownMenuItem
                    key={fieldOption.value}
                    onClick={() => setSortField(fieldOption.value)}
                  >
                    {fieldOption.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="w-fit">
                  Date range: {selectedDateRangeLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {DATE_RANGE_OPTIONS.map((rangeOption) => (
                  <DropdownMenuItem
                    key={rangeOption.value}
                    onClick={() => setDateRange(rangeOption.value)}
                  >
                    {rangeOption.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-muted-foreground">Loading sessions…</p>
        </div>
      ) : null}

      {!isLoading && hasFatalError ? (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-sm text-destructive">{error ?? "Could not load sessions."}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && !hasSessions ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8">
          No sessions found for {selectedDateRangeLabel.toLowerCase()}.
        </div>
      ) : null}

      {!isLoading && hasSessions ? (
        <>
          <SessionsCards sessions={sessions} currencyCode={defaultCurrency} />
          <SessionsTable sessions={sessions} currencyCode={defaultCurrency} />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadMore()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading more…" : "Load more sessions"}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              You are viewing all sessions in this range.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
