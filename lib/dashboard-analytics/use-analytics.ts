"use client";

import { useQuery } from "@tanstack/react-query";
import type { PreferencesData } from "@/lib/preferences/use-preferences";
import type { DashboardAnalyticsResponse } from "@/lib/dashboard-analytics";

// Preference values (timezone, currency) are intentionally excluded from the
// query key: the API reads timezone from the user's profile server-side, so
// the client never sends them. Including them would create false cache
// variation for identical data.
//
// The `month` param IS included so cache entries are scoped per month — the
// user can navigate between months without stomping on cached responses.
export const analyticsQueryKey = (month: string) =>
  ["analytics", { month }] as const;

export async function fetchAnalytics(
  month: string,
): Promise<DashboardAnalyticsResponse> {
  const res = await fetch(
    `/api/dashboard/analytics?month=${encodeURIComponent(month)}`,
  );
  if (!res.ok) {
    throw new Error("Could not load dashboard analytics.");
  }
  return (await res.json()) as DashboardAnalyticsResponse;
}

export function useAnalytics(
  preferences: PreferencesData | undefined,
  month = "current",
) {
  return useQuery({
    queryKey: analyticsQueryKey(month),
    queryFn: () => fetchAnalytics(month),
    enabled: !!preferences,
  });
}
