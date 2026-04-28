"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { getDefaultReportingTimezone } from "@/lib/timezones";

export interface PreferencesData {
  defaultCurrency: string;
  reportingTimezone: string;
}

export const PREFERENCES_QUERY_KEY = ["preferences"] as const;

export async function fetchPreferences(): Promise<PreferencesData> {
  const res = await fetch("/api/preferences");
  if (!res.ok) {
    throw new Error("Could not load preferences.");
  }
  const data = (await res.json()) as Partial<PreferencesData>;
  return {
    defaultCurrency: data.defaultCurrency ?? DEFAULT_CURRENCY,
    reportingTimezone: data.reportingTimezone ?? getDefaultReportingTimezone(),
  };
}

export function usePreferences() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: fetchPreferences,
  });
}
