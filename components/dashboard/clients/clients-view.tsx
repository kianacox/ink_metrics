"use client";

import { useEffect, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ErrorState,
  Input,
} from "@/components/ui";
import { useClients } from "@/components/dashboard/clients/hooks/use-clients";
import type { ClientListItem, ClientSortField } from "@/lib/clients/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { DateRangeDropdown, DATE_RANGE_OPTIONS } from "@/components/dashboard/shared/date-range-dropdown";
import { ClientsCards } from "./clients-cards";
import { ClientsSkeleton } from "./clients-skeleton";
import { ClientsTable } from "./clients-table";
import { ClientCreateModal } from "./client-create-modal";
import { ClientEditModal } from "./client-edit-modal";
import { ClientDeleteModal } from "./client-delete-modal";

const SORT_FIELDS: Array<{ label: string; value: ClientSortField }> = [
  { label: "Sessions", value: "session_count" },
  { label: "Total value", value: "total_value" },
];

const DEFAULT_SORT_FIELD: ClientSortField = "session_count";
const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";
const SEARCH_DEBOUNCE_DELAY_MS = 300;

const DATE_RANGE_SHORT_LABEL: Record<SessionDateRangePreset, string> = {
  thisMonth: "this month",
  last30Days: "30d",
  last90Days: "90d",
  yearToDate: "YTD",
  allTime: "all time",
};

export function ClientsView() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<ClientSortField>(DEFAULT_SORT_FIELD);
  const [dateRange, setDateRange] = useState<SessionDateRangePreset>(DEFAULT_DATE_RANGE);
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientListItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    clients,
    defaultCurrency,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  } = useClients({ searchQuery, sortField, dateRange });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, SEARCH_DEBOUNCE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const selectedSortLabel =
    SORT_FIELDS.find((o) => o.value === sortField)?.label ?? "Sessions";
  const selectedDateRangeLabel =
    DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? "Last 90 days";
  const dateRangeShortLabel = DATE_RANGE_SHORT_LABEL[dateRange] ?? "range";
  const hasClients = clients.length > 0;
  const hasFatalError = Boolean(error) && !hasClients;

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
          All clients
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by name and sort by sessions or total value (descending).
        </p>

        <div className="mt-4 grid gap-3 sm:mt-5">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by client name"
            aria-label="Search clients by name"
          />
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="default" className="w-fit">
                  Sort by: {selectedSortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SORT_FIELDS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortField(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DateRangeDropdown value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {isLoading ? <ClientsSkeleton /> : null}

      {!isLoading && hasFatalError ? (
        <ErrorState
          message={error ?? "Could not load clients."}
          onRetry={() => void reload()}
        />
      ) : null}

      {!isLoading && !error && !hasClients ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8">
          No clients found for {selectedDateRangeLabel.toLowerCase()}.
        </div>
      ) : null}

      {!isLoading && hasClients ? (
        <>
          <ClientsCards
            clients={clients}
            currencyCode={defaultCurrency}
            dateRangeLabel={dateRangeShortLabel}
            onEditClient={setEditingClient}
            onDeleteClient={setDeletingClient}
          />
          <ClientsTable
            clients={clients}
            currencyCode={defaultCurrency}
            dateRangeLabel={dateRangeShortLabel}
            onEditClient={setEditingClient}
            onDeleteClient={setDeletingClient}
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
                {isLoadingMore ? "Loading more…" : "Load more clients"}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              You are viewing all clients in this range.
            </p>
          )}
        </>
      ) : null}

      <FloatingActionButton
        data-testid="create-client-fab"
        aria-label="Create new client"
        onClick={() => setCreateOpen(true)}
      />

      <ClientCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          await reload();
          setToastMessage("Client created successfully.");
        }}
      />
      <ClientEditModal
        open={editingClient !== null}
        client={editingClient}
        onClose={() => setEditingClient(null)}
        onUpdated={async () => {
          await reload();
          setToastMessage("Client updated successfully.");
        }}
      />
      <ClientDeleteModal
        open={deletingClient !== null}
        client={deletingClient}
        onClose={() => setDeletingClient(null)}
        onDeleted={async () => {
          await reload();
          setToastMessage("Client deleted successfully.");
        }}
      />
    </section>
  );
}
