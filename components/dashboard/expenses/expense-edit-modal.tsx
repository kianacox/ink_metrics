"use client";

// Full implementation in commit 6 (Modals). This stub satisfies the import in expenses-view.

import type { ExpenseListItem } from "@/lib/expenses/models";

export interface ExpenseEditModalProps {
  open: boolean;
  expense: ExpenseListItem | null;
  defaultCurrency: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export function ExpenseEditModal(props: ExpenseEditModalProps): null {
  if (!props.open) return null;
  return null;
}
