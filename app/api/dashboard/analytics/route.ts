import {
  assertSupportedDashboardAnalyticsMonth,
  DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH_CODE,
  DashboardAnalyticsMonthParamError,
  fetchDashboardAnalytics,
} from "@/lib/dashboard-analytics";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function GET(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to view analytics.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view analytics." },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month");
    assertSupportedDashboardAnalyticsMonth(monthParam);

    return NextResponse.json(
      await fetchDashboardAnalytics({
        supabase,
        userId: user.id,
      }),
    );
  } catch (error) {
    if (error instanceof DashboardAnalyticsMonthParamError) {
      return errorJson(400, DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH_CODE, error.message);
    }

    return errorJson(500, "DASHBOARD_ANALYTICS_FAILED", "Could not load dashboard analytics.");
  }
}
