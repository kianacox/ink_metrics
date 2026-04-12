"use client";

import { useId, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses/models";
import { toMinorAmount } from "@/lib/profiles/profile-setup";

export interface ExpenseCreateModalProps {
  open: boolean;
  defaultCurrency: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseCreateModal({
  open,
  defaultCurrency,
  onClose,
  onCreated,
}: ExpenseCreateModalProps) {
  const titleId = useId();
  const [item, setItem] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [datePurchased, setDatePurchased] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setItem("");
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount("");
    setDatePurchased(today);
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
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
      const response = await fetch("/api/expenses", {
        method: "POST",
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
        setError(body.error ?? "Could not log expense.");
        return;
      }

      await onCreated();
      resetForm();
      onClose();
    } catch {
      setError("Could not log expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="Log an expense"
      description="Record a supply or business cost."
      onClose={handleClose}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="expense-item">Item name</Label>
          <Input
            id="expense-item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. Black ink refill"
            autoComplete="off"
            aria-required="true"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expense-category">Category</Label>
          <select
            id="expense-category"
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
          <Label htmlFor="expense-amount">Amount ({defaultCurrency})</Label>
          <Input
            id="expense-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 12.50"
            inputMode="decimal"
            autoComplete="off"
            aria-required="true"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expense-date">Date purchased</Label>
          <Input
            id="expense-date"
            type="date"
            value={datePurchased}
            onChange={(e) => setDatePurchased(e.target.value)}
            aria-required="true"
          />
        </div>

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
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Log expense"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
