"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";
import type { DeleteSessionApiResponse } from "@/components/dashboard/sessions/models";

interface SessionDeleteModalProps {
  open: boolean;
  session: SessionListItem | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

export function SessionDeleteModal({
  open,
  session,
  onClose,
  onDeleted,
}: SessionDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !session) {
    return null;
  }

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      });
      const responseBody = (await response.json()) as DeleteSessionApiResponse;
      if (!response.ok) {
        setError(responseBody.error ?? "Could not delete session.");
        return;
      }

      await onDeleted();
      onClose();
    } catch {
      setError("Could not delete session.");
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
        aria-labelledby="delete-session-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          aria-hidden
        />
        <CardHeader className="space-y-1.5 p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle id="delete-session-title" className="text-lg sm:text-xl">
            Delete Session
          </CardTitle>
          <CardDescription className="text-pretty">
            This action is irreversible. Are you sure you want to delete this session?
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
              {isDeleting ? "Deleting..." : "Confirm"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
