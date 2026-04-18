"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import type { SessionDateRangePreset } from "@/lib/timezones";

export const DATE_RANGE_OPTIONS: Array<{ label: string; value: SessionDateRangePreset }> = [
  { label: "Last 30 days", value: "last30Days" },
  { label: "Last 90 days", value: "last90Days" },
  { label: "Year to date", value: "yearToDate" },
  { label: "All time", value: "allTime" },
];

interface DateRangeDropdownProps {
  value: SessionDateRangePreset;
  onChange: (value: SessionDateRangePreset) => void;
  options?: Array<{ label: string; value: SessionDateRangePreset }>;
}

export function DateRangeDropdown({
  value,
  onChange,
  options = DATE_RANGE_OPTIONS,
}: DateRangeDropdownProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "Last 90 days";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="w-fit">
          Date range: {selectedLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
