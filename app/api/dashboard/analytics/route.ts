import {
  buildEmptyAnalyticsResponse,
  computeCurrentMonthWindow,
} from "@/lib/dashboard-analytics";
import { getDefaultReportingTimezone, getEffectiveReportingTimezone } from "@/lib/timezones";
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
    if (monthParam && monthParam !== "current") {
      return errorJson(
        400,
        "DASHBOARD_ANALYTICS_UNSUPPORTED_MONTH",
        "Only month=current is supported.",
      );
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("reporting_timezone")
      .eq("user_id", user.id)
      .limit(1);

    if (profileError) {
      throw new Error("Could not load dashboard analytics profile settings.");
    }

    const reportingTimezone = getEffectiveReportingTimezone(
      profileRows?.[0]?.reporting_timezone ?? getDefaultReportingTimezone(),
    );
    const monthWindow = computeCurrentMonthWindow({
      timezone: reportingTimezone,
    });

    return NextResponse.json(buildEmptyAnalyticsResponse(monthWindow));
  } catch {
    return errorJson(500, "DASHBOARD_ANALYTICS_FAILED", "Could not load dashboard analytics.");
  }
}
