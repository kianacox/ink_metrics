"use client";

import { useQuery } from "@tanstack/react-query";
import type { PreferencesData } from "@/lib/preferences/use-preferences";
import type { DashboardAnalyticsResponse } from "@/lib/dashboard-analytics";

// Preference values (timezone, currency) are intentionally excluded: the API
// reads timezone from the user's profile server-side, so the client never
// sends them. Including them would create false cache variation for identical data.
export const ANALYTICS_QUERY_KEY = ["analytics"] as const;

export async function fetchAnalytics(): Promise<DashboardAnalyticsResponse> {
  const res = await fetch("/api/dashboard/analytics?month=current", {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("Could not load dashboard analytics.");
  }
  return (await res.json()) as DashboardAnalyticsResponse;
}

export function useAnalytics(preferences: PreferencesData | undefined) {
  return useQuery({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: fetchAnalytics,
    enabled: !!preferences,
  });
}
