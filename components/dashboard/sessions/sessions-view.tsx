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
import type {
  SessionListItem,
  SessionSortField,
} from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { AddSessionModal } from "@/components/dashboard/session-form/add-session-modal";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { SessionsCards } from "./sessions-cards";
import { SessionsTable } from "./sessions-table";
import { SessionDeleteModal } from "./session-delete-modal";
import { SessionEditModal } from "./session-edit-modal";

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

const TOTAL_LABEL_BY_DATE_RANGE: Record<SessionDateRangePreset, string> = {
  thisMonth: "Sessions this month",
  last30Days: "Sessions in the last 30 days",
  last90Days: "Sessions in the last 90 days",
  yearToDate: "Sessions year to date",
  allTime: "Sessions all time",
};

export function SessionsView() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SessionSortField>(DEFAULT_SORT_FIELD);
  const [dateRange, setDateRange] = useState<SessionDateRangePreset>(DEFAULT_DATE_RANGE);
  const [editingSession, setEditingSession] = useState<SessionListItem | null>(null);
  const [deletingSession, setDeletingSession] = useState<SessionListItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const {
    sessions,
    totalCount,
    defaultCurrency,
    reportingTimezone,
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

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const selectedSortLabel =
    SORT_FIELDS.find((option) => option.value === sortField)?.label ?? "Date";
  const selectedDateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)?.label ?? "Last 90 days";
  const selectedDateRangeLabelLower = selectedDateRangeLabel.toLowerCase();
  const selectedTotalLabel = TOTAL_LABEL_BY_DATE_RANGE[dateRange] ?? "Sessions in this range";
  const hasSessions = sessions.length > 0;
  const hasFatalError = Boolean(error) && !hasSessions;

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      {toastMessage ? (
        <div
          className="fixed right-4 top-4 z-[60] max-w-xs rounded-md border border-border bg-background px-4 py-3 text-sm shadow-lg sm:right-6 sm:top-6"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      ) : null}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          All sessions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by client and sort by date, session length, or session profit (descending).
        </p>
        <p className="mt-3 text-sm text-foreground">
          {selectedTotalLabel}:{" "}
          <span className="font-semibold">{isLoading ? "..." : totalCount}</span>
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
          No sessions found for {selectedDateRangeLabelLower}.
        </div>
      ) : null}

      {!isLoading && hasSessions ? (
        <>
          <SessionsCards
            sessions={sessions}
            currencyCode={defaultCurrency}
            reportingTimezone={reportingTimezone}
            onEditSession={setEditingSession}
            onDeleteSession={setDeletingSession}
          />
          <SessionsTable
            sessions={sessions}
            currencyCode={defaultCurrency}
            reportingTimezone={reportingTimezone}
            onEditSession={setEditingSession}
            onDeleteSession={setDeletingSession}
          />
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

      <FloatingActionButton
        data-testid="create-session-fab"
        aria-label="Log new session"
        onClick={() => setCreateOpen(true)}
      />

      <AddSessionModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => void reload()}
      />

      <SessionEditModal
        open={editingSession !== null}
        session={editingSession}
        reportingTimezone={reportingTimezone}
        currencyCode={defaultCurrency}
        onClose={() => setEditingSession(null)}
        onUpdated={async () => {
          await reload();
          setToastMessage("Session updated successfully.");
        }}
      />
      <SessionDeleteModal
        open={deletingSession !== null}
        session={deletingSession}
        onClose={() => setDeletingSession(null)}
        onDeleted={async () => {
          await reload();
          setToastMessage("Session deleted successfully.");
        }}
      />
    </section>
  );
}
