"use client";

import { Input, Label } from "@/components/ui";
import { Clock3 } from "lucide-react";

interface SessionEditableFieldsProps {
  fieldIdPrefix: string;
  hours: string;
  minutes: string;
  sessionDateTime: string;
  profit: string;
  currencyCode: string;
  inProgress: boolean;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSessionDateTimeChange: (value: string) => void;
  onProfitChange: (value: string) => void;
  onInProgressChange: (value: boolean) => void;
}

function getCurrencySymbol(currencyCode: string): string {
  try {
    const currencyPart = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency");
    return currencyPart?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

export function SessionEditableFields({
  fieldIdPrefix,
  hours,
  minutes,
  sessionDateTime,
  profit,
  currencyCode,
  inProgress,
  onHoursChange,
  onMinutesChange,
  onSessionDateTimeChange,
  onProfitChange,
  onInProgressChange,
}: SessionEditableFieldsProps) {
  const hoursId = `${fieldIdPrefix}-session-hours`;
  const minutesId = `${fieldIdPrefix}-session-minutes`;
  const dateTimeId = `${fieldIdPrefix}-session-date-time`;
  const priceId = `${fieldIdPrefix}-session-price`;
  const inProgressId = `${fieldIdPrefix}-in-progress`;
  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <>
      <div className="grid min-w-0 gap-2">
        <Label>Session length</Label>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor={hoursId} className="text-muted-foreground">
              Hours
            </Label>
            <Input
              id={hoursId}
              type="number"
              min={0}
              step={1}
              value={hours}
              onChange={(event) => onHoursChange(event.target.value)}
              required
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor={minutesId} className="text-muted-foreground">
              Minutes
            </Label>
            <Input
              id={minutesId}
              type="number"
              min={0}
              max={59}
              step={1}
              value={minutes}
              onChange={(event) => onMinutesChange(event.target.value)}
              required
            />
          </div>
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={dateTimeId}>Session date and time</Label>
        <div className="relative overflow-hidden">
          <Clock3
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={dateTimeId}
            type="datetime-local"
            value={sessionDateTime}
            onChange={(event) => onSessionDateTimeChange(event.target.value)}
            className="w-full min-w-0 max-w-full pl-8"
            required
          />
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor={priceId}>Price</Label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            aria-hidden
          >
            {currencySymbol}
          </span>
          <Input
            id={priceId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={profit}
            onChange={(event) => onProfitChange(event.target.value)}
            className="pl-8"
            required
          />
        </div>
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
