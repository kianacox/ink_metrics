"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatDateTimeLocalForTimezone } from "@/lib/timezones";
import type { SessionListItem } from "@/components/dashboard/sessions/utils/session-listing";
import { validateEditableSessionFields } from "@/components/dashboard/session-form/utils/session-form-validation";
import { SessionEditableFields } from "@/components/dashboard/session-form/session-editable-fields";
import type { UpdateSessionApiResponse } from "@/components/dashboard/sessions/models";

interface SessionEditModalProps {
  open: boolean;
  session: SessionListItem | null;
  reportingTimezone: string;
  currencyCode: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

function toHoursAndMinutes(totalMinutes: number): { hours: string; minutes: string } {
  const normalizedMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return { hours: String(hours), minutes: String(minutes) };
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
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [profit, setProfit] = useState("");
  const [sessionDateTime, setSessionDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session) {
      return;
    }
    const duration = toHoursAndMinutes(session.durationMinutes);
    setHours(duration.hours);
    setMinutes(duration.minutes);
    setProfit(toProfitValue(session.priceMinor));
    setSessionDateTime(
      formatDateTimeLocalForTimezone(new Date(session.createdAt), reportingTimezone),
    );
    setError(null);
  }, [open, reportingTimezone, session]);

  if (!open || !session) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationResult = validateEditableSessionFields({
      hours,
      minutes,
      profit,
      sessionAtLocal: sessionDateTime,
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
          sessionDurationMinutes: validationResult.sessionDurationMinutes,
          sessionAtIso: validationResult.sessionAtIso,
        }),
      });

      const responseBody = (await response.json()) as UpdateSessionApiResponse;
      if (!response.ok) {
        setError(responseBody.error ?? "Could not update session.");
        return;
      }

      await onUpdated();
      onClose();
    } catch {
      setError("Could not update session.");
    } finally {
      setIsSubmitting(false);
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
          "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-1rem))] w-full overflow-y-auto rounded-b-none rounded-t-2xl border-border shadow-lg sm:max-h-[min(90dvh,40rem)] sm:max-w-md sm:rounded-xl",
          "pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pt-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          aria-hidden
        />
        <CardHeader className="space-y-1.5 p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle id="edit-session-title" className="text-lg sm:text-xl">
            Edit Session
          </CardTitle>
          <CardDescription className="text-pretty">
            Update session details. Client details are locked for existing sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1 sm:p-6 sm:pt-1">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-client-name">Client</Label>
              <Input id="edit-client-name" value={session.clientName} disabled />
            </div>
            <SessionEditableFields
              fieldIdPrefix="edit"
              hours={hours}
              minutes={minutes}
              sessionDateTime={sessionDateTime}
              profit={profit}
              currencyCode={currencyCode}
              onHoursChange={setHours}
              onMinutesChange={setMinutes}
              onSessionDateTimeChange={setSessionDateTime}
              onProfitChange={setProfit}
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
        </CardContent>
      </Card>
    </div>
  );
}
