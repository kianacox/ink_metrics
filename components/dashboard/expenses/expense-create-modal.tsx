"use client";

// Full implementation in commit 6 (Modals). This stub satisfies the import in expenses-view.

export interface ExpenseCreateModalProps {
  open: boolean;
  defaultCurrency: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function ExpenseCreateModal(props: ExpenseCreateModalProps): null {
  if (!props.open) return null;
  return null;
}
