"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ExpenseListItem } from "@/lib/expenses/models";

export interface ExpenseDeleteModalProps {
  open: boolean;
  expense: ExpenseListItem | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

export function ExpenseDeleteModal({
  open,
  expense,
  onClose,
  onDeleted,
}: ExpenseDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !expense) {
    return null;
  }

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not delete expense.");
        return;
      }

      await onDeleted();
      onClose();
    } catch {
      setError("Could not delete expense.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <Card
        className={cn(
          "w-full rounded-b-none rounded-t-2xl border-border shadow-lg sm:max-w-md sm:rounded-xl",
          "pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pt-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-expense-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          aria-hidden
        />
        <CardHeader className="space-y-1.5 p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle id="delete-expense-title" className="text-lg sm:text-xl">
            Delete expense
          </CardTitle>
          <CardDescription className="text-pretty">
            This action is irreversible. Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{expense.item}</span>?
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1 sm:p-6 sm:pt-1">
          {error ? (
            <p className="text-sm text-destructive" role="status">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
