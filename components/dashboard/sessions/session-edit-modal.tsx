"use client";

import { useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label } from "@/components/ui";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";
import { validateEditableSessionFields } from "@/components/dashboard/session-form/utils/session-form-validation";
import { SessionEditableFields } from "@/components/dashboard/session-form/session-editable-fields";
import { SessionModalShell } from "@/components/dashboard/session-form/session-modal-shell";
import type { UpdateSessionApiResponse } from "@/components/dashboard/sessions/models";

interface SessionEditModalProps {
  open: boolean;
  session: SessionListItem | null;
  reportingTimezone: string;
  currencyCode: string;
  onClose: () => void;
  onUpdated: () => void;
}

function toProfitValue(priceMinor: number): string {
  return (priceMinor / 100).toFixed(2);
}

export function SessionEditModal({
  open,
  session,
  reportingTimezone,
  currencyCode,
  onClose,
  onUpdated,
}: SessionEditModalProps) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const [profit, setProfit] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [inProgress, setInProgress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session) {
      return;
    }
    setProfit(toProfitValue(session.priceMinor));
    setSessionDate(session.sessionDate);
    setInProgress(session.inProgress);
    setError(null);
  }, [open, session]);

  if (!open || !session) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationResult = validateEditableSessionFields({
      profit,
      sessionDate,
      reportingTimezone,
    });
    if (!validationResult.valid) {
      setError(validationResult.errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceMinor: validationResult.priceMinor,
          sessionDate: validationResult.sessionDate,
          inProgress,
        }),
      });

      const responseBody = (await response.json()) as UpdateSessionApiResponse;
      if (!response.ok) {
        setError(responseBody.error ?? "Could not update session.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      onUpdated();
      onClose();
    } catch {
      setError("Could not update session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SessionModalShell
      open={open}
      titleId={titleId}
      title="Edit Session"
      description="Update session details. Client details are locked for existing sessions."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-client-name">Client</Label>
          <Input id="edit-client-name" value={session.clientName} disabled />
        </div>
        <SessionEditableFields
          fieldIdPrefix="edit"
          sessionDate={sessionDate}
          profit={profit}
          currencyCode={currencyCode}
          inProgress={inProgress}
          onSessionDateChange={setSessionDate}
          onProfitChange={setProfit}
          onInProgressChange={setInProgress}
        />
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
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </form>
    </SessionModalShell>
  );
}
