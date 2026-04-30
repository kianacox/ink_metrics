"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface CreateClientPayload {
  name: string;
  contactInfo: string;
}

export interface UpdateClientPayload {
  id: string;
  name: string;
  contactInfo: string;
}

export interface DeleteClientPayload {
  id: string;
}

interface MutationCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const CLIENTS_QUERY_KEY = ["clients"] as const;

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function useCreateClient({ onSuccess, onError }: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not create client.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      onSuccess?.();
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useUpdateClient({ onSuccess, onError }: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, contactInfo }: UpdateClientPayload) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactInfo }),
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not update client.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      onSuccess?.();
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useDeleteClient({ onSuccess, onError }: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteClientPayload) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not delete client.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      onSuccess?.();
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}
