"use client";

// Full implementation in commit 6 (Modals). This stub satisfies the import in expenses-view.

import type { ExpenseListItem } from "@/lib/expenses/models";

export interface ExpenseDeleteModalProps {
  open: boolean;
  expense: ExpenseListItem | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

export function ExpenseDeleteModal(props: ExpenseDeleteModalProps): null {
  if (!props.open) return null;
  return null;
}
