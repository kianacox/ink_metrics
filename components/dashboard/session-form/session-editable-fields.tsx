"use client";

import { Input, Label } from "@/components/ui";
import { DatePicker } from "@/components/dashboard/shared/date-picker";

interface SessionEditableFieldsProps {
  fieldIdPrefix: string;
  sessionDate: string;          // "YYYY-MM-DD"
  profit: string;
  currencyCode: string;
  inProgress: boolean;
  onSessionDateChange: (value: string) => void;
  onProfitChange: (value: string) => void;
  onInProgressChange: (value: boolean) => void;
}

const MONTHS_OF_SESSION_BACKDATING = 6;

function getSessionDateBounds(): { before: Date; after: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - MONTHS_OF_SESSION_BACKDATING);

  return { before: sixMonthsAgo, after: today };
}

export function SessionEditableFields({
  fieldIdPrefix,
  sessionDate,
  profit,
  currencyCode,
  inProgress,
  onSessionDateChange,
  onProfitChange,
  onInProgressChange,
}: SessionEditableFieldsProps) {
  const priceId = `${fieldIdPrefix}-session-price`;
  const inProgressId = `${fieldIdPrefix}-in-progress`;

  return (
    <>
      <div className="grid min-w-0 gap-2">
        <Label>Session date</Label>
        <p className="text-xs text-muted-foreground">
          You can backdate sessions by up to 6 months.
        </p>
        <DatePicker
          value={sessionDate}
          onChange={onSessionDateChange}
          disabled={getSessionDateBounds()}
          data-testid="session-date-picker"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={priceId}>Price ({currencyCode})</Label>
        <Input
          id={priceId}
          inputMode="decimal"
          placeholder="e.g. 12.50"
          value={profit}
          onChange={(event) => onProfitChange(event.target.value)}
          required
        />
      </div>
      <div className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
        <input
          id={inProgressId}
          type="checkbox"
          checked={inProgress}
          onChange={(event) => onInProgressChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border border-input"
        />
        <div className="grid gap-0.5">
          <Label htmlFor={inProgressId} className="cursor-pointer leading-5">
            Follow-up session needed
          </Label>
          <p className="text-xs text-muted-foreground">
            For multi-session pieces billed per session — not touch-ups.
          </p>
        </div>
      </div>
    </>
  );
}
