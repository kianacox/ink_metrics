"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ErrorState, LoadingState } from "@/components/ui";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { useExpenses } from "@/components/dashboard/expenses/hooks/use-expenses";
import type { ExpenseListItem } from "@/lib/expenses/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { DateRangeDropdown, DATE_RANGE_OPTIONS } from "@/components/dashboard/shared/date-range-dropdown";
import { ExpensesCards } from "./expenses-cards";
import { ExpensesTable } from "./expenses-table";
import { ExpenseCategoryFilterPills } from "./expense-category-filter-pills";
import { ExpenseCreateModal } from "./expense-create-modal";
import { ExpenseEditModal } from "./expense-edit-modal";
import { ExpenseDeleteModal } from "./expense-delete-modal";
import { formatExpenseAmount } from "./utils/expense-formatting";

const DEFAULT_DATE_RANGE: SessionDateRangePreset = "last90Days";

const RANGE_TOTAL_LABEL: Record<SessionDateRangePreset, string> = {
  thisMonth: "Expenses this month",
  last30Days: "Expenses last 30 days",
  last90Days: "Expenses last 90 days",
  yearToDate: "Expenses year to date",
  allTime: "Expenses all time",
};

export function ExpensesView() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<SessionDateRangePreset>(DEFAULT_DATE_RANGE);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseListItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedCategoriesArray = useMemo(
    () => Array.from(selectedCategories),
    [selectedCategories],
  );

  const {
    expenses,
    rangeTotalMinor,
    defaultCurrency,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  } = useExpenses({ selectedCategories: selectedCategoriesArray, dateRange });

  const selectedDateRangeLabel =
    DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? "Last 90 days";
  const selectedDateRangeLabelLower = selectedDateRangeLabel.toLowerCase();
  const rangeTotalLabel = RANGE_TOTAL_LABEL[dateRange] ?? "Expenses in this range";

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const hasExpenses = expenses.length > 0;
  const hasFatalError = Boolean(error) && !hasExpenses;

  return (
    <section className="flex min-w-0 flex-col gap-4 sm:gap-6">
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
        <p className="text-sm text-muted-foreground">
          {rangeTotalLabel}:{" "}
          <span className="font-semibold text-foreground">
            {isLoading ? "…" : formatExpenseAmount(rangeTotalMinor, defaultCurrency)}
          </span>
        </p>
      </div>

      <ExpenseCategoryFilterPills
        selectedCategories={selectedCategories}
        onToggle={toggleCategory}
        onClearAll={() => setSelectedCategories(new Set())}
      />

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">All expenses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your supply and business costs.
        </p>
        <p className="mt-3 text-sm text-foreground">
          {rangeTotalLabel}:{" "}
          <span className="font-semibold">{isLoading ? "..." : expenses.length}</span>
        </p>
        <div className="mt-4">
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {isLoading ? <LoadingState message="Loading expenses…" /> : null}

      {!isLoading && hasFatalError ? (
        <ErrorState
          message={error ?? "Could not load expenses."}
          onRetry={() => void reload()}
        />
      ) : null}

      {!isLoading && !error && !hasExpenses ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8">
          {selectedCategories.size > 0
            ? `No expenses found for the selected categories in ${selectedDateRangeLabelLower}.`
            : `No expenses found for ${selectedDateRangeLabelLower}.`}
        </div>
      ) : null}

      {!isLoading && hasExpenses ? (
        <>
          <ExpensesCards
            expenses={expenses}
            currencyCode={defaultCurrency}
            onEditExpense={setEditingExpense}
            onDeleteExpense={setDeletingExpense}
          />
          <ExpensesTable
            expenses={expenses}
            currencyCode={defaultCurrency}
            onEditExpense={setEditingExpense}
            onDeleteExpense={setDeletingExpense}
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
                {isLoadingMore ? "Loading more…" : "Load more expenses"}
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              You are viewing all expenses for {selectedDateRangeLabelLower}.
            </p>
          )}
        </>
      ) : null}

      <FloatingActionButton
        data-testid="create-expense-fab"
        aria-label="Log new expense"
        onClick={() => setCreateOpen(true)}
      />

      <ExpenseCreateModal
        open={createOpen}
        defaultCurrency={defaultCurrency}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          await reload();
          setToastMessage("Expense logged successfully.");
        }}
      />
      <ExpenseEditModal
        open={editingExpense !== null}
        expense={editingExpense}
        defaultCurrency={defaultCurrency}
        onClose={() => setEditingExpense(null)}
        onUpdated={async () => {
          await reload();
          setToastMessage("Expense updated successfully.");
        }}
      />
      <ExpenseDeleteModal
        open={deletingExpense !== null}
        expense={deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onDeleted={async () => {
          await reload();
          setToastMessage("Expense deleted successfully.");
        }}
      />
    </section>
  );
}
