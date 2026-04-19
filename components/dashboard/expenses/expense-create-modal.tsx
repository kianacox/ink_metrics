"use client";

import { useId, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expenses/models";
import { toMinorAmount } from "@/lib/profiles/profile-setup";
import {
  isUploadError,
  uploadExpenseReceipt,
  validateReceiptFile,
} from "@/lib/expenses/upload-expense-receipt";

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
  const [receiptWarning, setReceiptWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  function resetForm() {
    setItem("");
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount("");
    setDatePurchased(today);
    setError(null);
    setReceiptWarning(null);
    setSelectedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    // Validate receipt file before submitting if one is selected
    const receiptFile = fileInputRef.current?.files?.[0] ?? null;
    if (receiptFile) {
      const fileError = validateReceiptFile(receiptFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    setIsSubmitting(true);
    setReceiptWarning(null);
    try {
      // Step 1: create the expense row
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

      const body = (await response.json()) as { error?: string; expenseId?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not log expense.");
        return;
      }

      const expenseId = body.expenseId;

      // Step 2 (optional): upload receipt and patch
      if (receiptFile && expenseId) {
        const uploadResult = await uploadExpenseReceipt({ expenseId, file: receiptFile });

        if (isUploadError(uploadResult)) {
          // Non-blocking: expense was saved but receipt upload failed
          const warning = `Expense logged, but receipt could not be uploaded: ${uploadResult.error}`;
          setReceiptWarning(warning);
          await onCreated();
          return; // keep modal open for retry
        } else {
          // Step 3: patch with receipt metadata
          await fetch(`/api/expenses/${expenseId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              receiptPath: uploadResult.path,
              receiptMimeType: uploadResult.mimeType,
              receiptSizeBytes: uploadResult.sizeBytes,
            }),
          });
        }
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
          <div className="overflow-hidden">
            <Input
              id="expense-date"
              type="date"
              value={datePurchased}
              onChange={(e) => setDatePurchased(e.target.value)}
              className="w-full min-w-0"
              aria-required="true"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>
            Receipt{" "}
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <input
            id="expense-receipt"
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
