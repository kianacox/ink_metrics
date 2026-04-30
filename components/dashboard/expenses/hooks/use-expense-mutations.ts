"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExpenseCategory } from "@/lib/expenses/models";

export interface CreateExpensePayload {
  item: string;
  category: ExpenseCategory;
  amountMinor: number;
  currencyCode: string;
  datePurchased: string;
}

export interface UpdateExpensePayload extends CreateExpensePayload {
  id: string;
}

export interface DeleteExpensePayload {
  id: string;
}

export interface CreateExpenseResponse {
  expenseId?: string;
}

interface MutationCallbacks<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

const EXPENSES_QUERY_KEY = ["expenses"] as const;
const ANALYTICS_QUERY_KEY = ["analytics"] as const;

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function invalidateExpenseCaches(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  void queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
}

export function useCreateExpense({
  onSuccess,
  onError,
}: MutationCallbacks<CreateExpenseResponse> = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload): Promise<CreateExpenseResponse> => {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not log expense.");
        throw new Error(message);
      }
      return (await response.json()) as CreateExpenseResponse;
    },
    onSuccess: (data) => {
      invalidateExpenseCaches(queryClient);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useUpdateExpense({
  onSuccess,
  onError,
}: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateExpensePayload) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not update expense.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      invalidateExpenseCaches(queryClient);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useDeleteExpense({
  onSuccess,
  onError,
}: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteExpensePayload) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not delete expense.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      invalidateExpenseCaches(queryClient);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}
