"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { DatePicker } from "@/components/dashboard/shared/date-picker";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses/models";
import type { ExpenseListItem } from "@/lib/expenses/models";
import { toMinorAmount } from "@/lib/profiles/profile-setup";
import {
  isUploadError,
  uploadExpenseReceipt,
  validateReceiptFile,
} from "@/lib/expenses/upload-expense-receipt";
import { Paperclip } from "lucide-react";
import { useUpdateExpense } from "@/components/dashboard/expenses/hooks/use-expense-mutations";

export interface ExpenseEditModalProps {
  open: boolean;
  expense: ExpenseListItem | null;
  defaultCurrency: string;
  onClose: () => void;
  onUpdated: () => void;
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
  const [error, setError] = useState<string | null>(null);
  const [receiptWarning, setReceiptWarning] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const { mutateAsync: updateExpense, isPending: isUpdating } = useUpdateExpense({
    onError: (err) => {
      setError(err.message);
    },
  });

  const isSubmitting = isUpdating || isUploadingReceipt;

  // Future dates are not valid for an expense.
  const datePickerBounds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { after: today };
  }, []);

  useEffect(() => {
    if (!open || !expense) {
      return;
    }
    setItem(expense.item);
    setCategory(expense.category);
    setAmount((expense.amountMinor / 100).toFixed(2));
    setDatePurchased(expense.datePurchased);
    setSelectedFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    // Validate receipt if one is selected
    const receiptFile = fileInputRef.current?.files?.[0] ?? null;
    if (receiptFile) {
      const fileError = validateReceiptFile(receiptFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    setReceiptWarning(null);

    try {
      await updateExpense({
        id: expense.id,
        item: trimmedItem,
        category,
        amountMinor,
        currencyCode: defaultCurrency,
        datePurchased,
      });
    } catch {
      // onError handler already populated `error`
      return;
    }

    // Handle optional receipt replacement
    if (receiptFile) {
      setIsUploadingReceipt(true);
      try {
        const uploadResult = await uploadExpenseReceipt({ expenseId: expense.id, file: receiptFile });

        if (isUploadError(uploadResult)) {
          setReceiptWarning(
            `Expense saved, but receipt could not be uploaded: ${uploadResult.error}`,
          );
          onUpdated();
          return; // keep modal open for retry
        }

        await fetch(`/api/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiptPath: uploadResult.path,
            receiptMimeType: uploadResult.mimeType,
            receiptSizeBytes: uploadResult.sizeBytes,
          }),
        });
      } finally {
        setIsUploadingReceipt(false);
      }
    }

    onUpdated();
    onClose();
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
          <DatePicker
            id="edit-expense-date"
            value={datePurchased}
            onChange={setDatePurchased}
            disabled={datePickerBounds}
            aria-required
            data-testid="edit-expense-date-picker"
          />
        </div>

        <div className="grid gap-2">
          <Label>
            {expense.receiptPath ? (
              <span>
                Replace receipt{" "}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </span>
            ) : (
              <span>
                Attach receipt{" "}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </span>
            )}
          </Label>
          <input
            id="edit-expense-receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            ref={fileInputRef}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name ?? null)}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="mr-1.5 size-4" aria-hidden="true" />
              Choose file
            </Button>
            {selectedFileName ? (
              <span className="truncate text-sm text-foreground">{selectedFileName}</span>
            ) : expense.receiptPath ? (
              <span className="text-sm text-muted-foreground">Current receipt attached</span>
            ) : (
              <span className="text-sm text-muted-foreground">No file chosen</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or PDF. Max 5 MB.</p>
        </div>

        {receiptWarning ? (
          <p className="rounded-none border border-gold/50 bg-gold/10 px-3 py-2 text-sm text-gold" role="status">
            {receiptWarning}
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
