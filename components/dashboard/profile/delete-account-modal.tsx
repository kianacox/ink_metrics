"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDeleteAccount } from "@/components/dashboard/profile/hooks/use-delete-account";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const [error, setError] = useState<string | null>(null);
  const { isDeleting, deleteAccount } = useDeleteAccount();

  if (!open) {
    return null;
  }

  const handleDelete = async () => {
    setError(null);
    const result = await deleteAccount();
    if (!result.success) {
      setError(result.error ?? "Could not delete account.");
    }
    // On success, useDeleteAccount handles signOut + redirect — modal unmounts automatically.
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
        aria-labelledby="delete-account-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          aria-hidden
        />
        <CardHeader className="space-y-1.5 p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle id="delete-account-title" className="text-lg sm:text-xl">
            Delete account
          </CardTitle>
          <CardDescription className="text-pretty">
            This action is permanent and cannot be undone. All your sessions, profile,
            and compensation data will be deleted immediately.
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
