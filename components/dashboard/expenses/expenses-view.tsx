"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { useExpenses } from "@/components/dashboard/expenses/hooks/use-expenses";
import type { ExpenseListItem } from "@/lib/expenses/models";
import { ExpensesCards } from "./expenses-cards";
import { ExpensesTable } from "./expenses-table";
import { ExpenseCategoryFilterPills } from "./expense-category-filter-pills";
import { ExpenseCreateModal } from "./expense-create-modal";
import { ExpenseEditModal } from "./expense-edit-modal";
import { ExpenseDeleteModal } from "./expense-delete-modal";
import { formatExpenseAmount } from "./utils/expense-formatting";

export function ExpensesView() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
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
    totalCount,
    currentMonthTotalMinor,
    defaultCurrency,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    reload,
    loadMore,
  } = useExpenses({ selectedCategories: selectedCategoriesArray });

  const currentMonthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

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
        <p className="text-sm text-muted-foreground">
          Expenses {currentMonthLabel}:{" "}
          <span className="font-semibold text-foreground">
            {isLoading ? "…" : formatExpenseAmount(currentMonthTotalMinor, defaultCurrency)}
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
          Total expenses:{" "}
          <span className="font-semibold">{isLoading ? "..." : totalCount}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-muted-foreground">Loading expenses…</p>
        </div>
      ) : null}

      {!isLoading && hasFatalError ? (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <p className="text-sm text-destructive">{error ?? "Could not load expenses."}</p>
          <Button
            type="button"
            className="mt-3"
            variant="outline"
            onClick={() => void reload()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && !hasExpenses ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-8">
          {selectedCategories.size > 0
            ? "No expenses found for the selected categories."
            : "No expenses logged yet. Use the button below to log your first expense."}
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
              You are viewing all expenses.
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
