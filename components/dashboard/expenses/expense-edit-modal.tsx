"use client";

import { useEffect, useId, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses/models";
import type { ExpenseListItem } from "@/lib/expenses/models";
import { toMinorAmount } from "@/lib/profiles/profile-setup";
import { Paperclip } from "lucide-react";

export interface ExpenseEditModalProps {
  open: boolean;
  expense: ExpenseListItem | null;
  defaultCurrency: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export function ExpenseEditModal({
  open,
  expense,
  defaultCurrency,
  onClose,
  onUpdated,
}: ExpenseEditModalProps) {
  const titleId = useId();
  const [item, setItem] = useState("");
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>(
    EXPENSE_CATEGORIES[0],
  );
  const [amount, setAmount] = useState("");
  const [datePurchased, setDatePurchased] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !expense) {
      return;
    }
    setItem(expense.item);
    setCategory(expense.category);
    setAmount((expense.amountMinor / 100).toFixed(2));
    setDatePurchased(expense.datePurchased);
    setError(null);
  }, [open, expense]);

  if (!open || !expense) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedItem = item.trim();
    if (!trimmedItem) {
      setError("Item name is required.");
      return;
    }

    const amountMinor = toMinorAmount(amount);
    if (amountMinor === null) {
      setError("Amount must be a valid non-negative number.");
      return;
    }

    if (!datePurchased) {
      setError("Date purchased is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: trimmedItem,
          category,
          amountMinor,
          currencyCode: defaultCurrency,
          datePurchased,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not update expense.");
        return;
      }

      await onUpdated();
      onClose();
    } catch {
      setError("Could not update expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="Edit expense"
      description="Update the details of this expense."
      onClose={onClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-expense-item">Item name</Label>
          <Input
            id="edit-expense-item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            autoComplete="off"
            aria-required="true"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-expense-category">Category</Label>
          <select
            id="edit-expense-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-required="true"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-expense-amount">Amount ({defaultCurrency})</Label>
          <Input
            id="edit-expense-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            aria-required="true"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-expense-date">Date purchased</Label>
          <Input
            id="edit-expense-date"
            type="date"
            value={datePurchased}
            onChange={(e) => setDatePurchased(e.target.value)}
            aria-required="true"
          />
        </div>

        {expense.receiptPath ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Paperclip aria-hidden="true" className="size-4 shrink-0" />
            Receipt attached
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
