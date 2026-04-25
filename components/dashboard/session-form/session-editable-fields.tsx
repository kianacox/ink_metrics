"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

function parseDateString(dateString: string): Date | undefined {
  if (!dateString) return undefined;
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString: string): string {
  const parsed = parseDateString(dateString);
  if (!parsed) return "Pick a date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

function getDisabledDays(): { before: Date; after: Date } | { after: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  const priceId = `${fieldIdPrefix}-session-price`;
  const inProgressId = `${fieldIdPrefix}-in-progress`;
  const currencySymbol = getCurrencySymbol(currencyCode);

  const selectedDate = parseDateString(sessionDate);
  const disabledDays = getDisabledDays();

  function handleDaySelect(day: Date | undefined) {
    if (day) {
      onSessionDateChange(formatDateToYYYYMMDD(day));
      setCalendarOpen(false);
    }
  }

  return (
    <>
      <div className="grid min-w-0 gap-2">
        <Label>Session date</Label>
        <p className="text-xs text-muted-foreground">
          You can backdate sessions by up to 6 months.
        </p>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                !sessionDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              {formatDateForDisplay(sessionDate)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDaySelect}
              disabled={disabledDays}
              defaultMonth={selectedDate}
            />
          </PopoverContent>
        </Popover>
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
