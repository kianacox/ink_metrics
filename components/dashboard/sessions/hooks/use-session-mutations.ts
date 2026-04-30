"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SaveSessionApiResponse } from "@/components/dashboard/session-form/models";

export interface CreateSessionPayload {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDate: string;
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface UpdateSessionPayload {
  id: string;
  priceMinor: number;
  sessionDate: string;
  inProgress: boolean;
}

export interface DeleteSessionPayload {
  id: string;
}

interface MutationCallbacks<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

const SESSIONS_QUERY_KEY = ["sessions"] as const;
const ANALYTICS_QUERY_KEY = ["analytics"] as const;

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function invalidateSessionCaches(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
}

export function useCreateSession({
  onSuccess,
  onError,
}: MutationCallbacks<SaveSessionApiResponse> = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSessionPayload): Promise<SaveSessionApiResponse> => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not save session.");
        throw new Error(message);
      }
      return (await response.json()) as SaveSessionApiResponse;
    },
    onSuccess: (data) => {
      invalidateSessionCaches(queryClient);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useUpdateSession({
  onSuccess,
  onError,
}: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateSessionPayload) => {
      const response = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not update session.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      invalidateSessionCaches(queryClient);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}

export function useDeleteSession({
  onSuccess,
  onError,
}: MutationCallbacks = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteSessionPayload) => {
      const response = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, "Could not delete session.");
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      invalidateSessionCaches(queryClient);
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}
