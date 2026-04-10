"use client";

import { Input, Label } from "@/components/ui";

interface SessionEditableFieldsProps {
  fieldIdPrefix: string;
  hours: string;
  minutes: string;
  sessionDateTime: string;
  profit: string;
  currencyCode: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onSessionDateTimeChange: (value: string) => void;
  onProfitChange: (value: string) => void;
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
  onHoursChange,
  onMinutesChange,
  onSessionDateTimeChange,
  onProfitChange,
}: SessionEditableFieldsProps) {
  const hoursId = `${fieldIdPrefix}-session-hours`;
  const minutesId = `${fieldIdPrefix}-session-minutes`;
  const dateTimeId = `${fieldIdPrefix}-session-date-time`;
  const priceId = `${fieldIdPrefix}-session-price`;
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
        <Input
          id={dateTimeId}
          type="datetime-local"
          value={sessionDateTime}
          onChange={(event) => onSessionDateTimeChange(event.target.value)}
          className="min-w-0 max-w-full"
          required
        />
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
    </>
  );
}
