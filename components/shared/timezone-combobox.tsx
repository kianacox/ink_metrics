"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Label } from "@/components/ui";
import { getSupportedTimezones } from "@/lib/timezones";

interface TimezoneComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const TIMEZONE_MENU_CLOSE_DELAY_MS = 120;

export function TimezoneCombobox({
  id,
  label,
  value,
  onChange,
  required = false,
}: TimezoneComboboxProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(value);
  const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
  const selectedTimezone = useMemo(
    () => (timezoneOptions.includes(value) ? value : ""),
    [timezoneOptions, value],
  );

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  const filteredTimezoneOptions = useMemo(() => {
    const normalizedInput = searchValue.trim().toLowerCase();
    if (!normalizedInput) {
      return timezoneOptions;
    }

    return timezoneOptions.filter((timezone) =>
      timezone.toLowerCase().includes(normalizedInput),
    );
  }, [searchValue, timezoneOptions]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setIsMenuOpen(true);
          }}
          onFocus={() => {
            setSearchValue(selectedTimezone);
            setIsMenuOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setSearchValue(selectedTimezone);
              setIsMenuOpen(false);
            }, TIMEZONE_MENU_CLOSE_DELAY_MS);
          }}
          required={required}
        />
        {isMenuOpen ? (
          <div className="absolute left-1/2 top-full z-20 mt-1 w-full -translate-x-1/2 overflow-hidden rounded-md border border-border bg-background shadow-lg">
            <ul className="max-h-56 overflow-y-auto py-1">
              {filteredTimezoneOptions.length > 0 ? (
                filteredTimezoneOptions.map((timezone) => (
                  <li key={timezone}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        onChange(timezone);
                        setIsMenuOpen(false);
                      }}
                    >
                      {timezone}
                    </button>
                  </li>
                ))
              ) : (
                <li>
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No matching timezones found.
                  </p>
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
