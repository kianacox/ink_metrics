"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDateForDisplay,
  formatDateToYYYYMMDD,
  parseDateString,
} from "@/lib/dates/date-format";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  /** Selected date as a `YYYY-MM-DD` string, or `""` when nothing is picked. */
  value: string;
  /** Called with a `YYYY-MM-DD` string when the user picks a day. */
  onChange: (value: string) => void;
  /** Optional bounds — days strictly before `before` or strictly after `after` are disabled. */
  disabled?: { before?: Date; after?: Date };
  /** Optional id forwarded to the trigger button (for label association). */
  id?: string;
  /** Optional aria-required forwarded to the trigger button. */
  "aria-required"?: boolean;
  /** Optional data-testid forwarded to the trigger button. */
  "data-testid"?: string;
  /** Optional extra classes for the trigger button. */
  className?: string;
}

/**
 * Shared calendar+popover date picker.
 *
 * Renders a button that opens a calendar popover. No `Date` instances
 * cross the component boundary — values are exchanged as `YYYY-MM-DD`
 * strings only.
 */
export function DatePicker({
  value,
  onChange,
  disabled,
  id,
  "aria-required": ariaRequired,
  "data-testid": dataTestId,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = parseDateString(value);

  // react-day-picker accepts each bound as its own matcher and combines
  // them with OR, so we build a list of well-typed matchers from the
  // optional bounds rather than a partially-defined interval object.
  const disabledMatchers: Matcher[] = [];
  if (disabled?.before) disabledMatchers.push({ before: disabled.before });
  if (disabled?.after) disabledMatchers.push({ after: disabled.after });

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    onChange(formatDateToYYYYMMDD(day));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/*
          Surface aria-required so the picker reads as required to AT users —
          the spec mandates this attribute even though the implicit `button`
          role does not natively support it.
        */}
        {/* eslint-disable-next-line jsx-a11y/role-supports-aria-props */}
        <button
          type="button"
          id={id}
          aria-required={ariaRequired}
          data-testid={dataTestId}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          {formatDateForDisplay(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
          disabled={disabledMatchers}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}
