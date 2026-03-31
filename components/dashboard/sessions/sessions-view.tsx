"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "@/components/ui";
import { useSessions } from "@/components/dashboard/sessions/hooks/use-sessions";
import {
  getVisibleSessions,
  type SessionSortField,
} from "@/components/dashboard/sessions/utils/session-listing";
import { SessionsCards } from "./sessions-cards";
import { SessionsTable } from "./sessions-table";

const SORT_FIELDS: Array<{ label: string; value: SessionSortField }> = [
  { label: "Date", value: "date" },
  { label: "Duration", value: "duration" },
  { label: "Profit", value: "profit" },
];

const DEFAULT_SORT_FIELD: SessionSortField = "date";

export function SessionsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SessionSortField>(DEFAULT_SORT_FIELD);
  const { sessions, defaultCurrency, isLoading, error, reload } = useSessions();

  const visibleSessions = useMemo(
    () =>
      getVisibleSessions(sessions, searchQuery, {
        field: sortField,
        direction: "desc",
      }),
    [sessions, searchQuery, sortField],
  );

  const selectedSortLabel =
    SORT_FIELDS.find((option) => option.value === sortField)?.label ?? "Date";

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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by client name"
            aria-label="Search sessions by client name"
          />
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
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" className="mt-3" variant="outline" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && visibleSessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8">
          No sessions yet.
        </div>
      ) : null}

      {!isLoading && !error && visibleSessions.length > 0 ? (
        <>
          <SessionsCards sessions={visibleSessions} currencyCode={defaultCurrency} />
          <SessionsTable sessions={visibleSessions} currencyCode={defaultCurrency} />
        </>
      ) : null}
    </section>
  );
}
