"use client";

import { useQuery } from "@tanstack/react-query";
import type { PreferencesData } from "@/lib/preferences/use-preferences";
import type { DashboardAnalyticsResponse } from "@/lib/dashboard-analytics";

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
