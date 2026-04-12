import { DEFAULT_CURRENCY } from "@/lib/currency";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { getEffectiveReportingTimezone } from "@/lib/timezones";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to load preferences.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to load preferences." },
      { status: 401 },
    );
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("default_currency,reporting_timezone,display_advert_checkbox")
    .eq("user_id", user.id)
    .limit(1);

  const profile = profileRows?.[0];
  return NextResponse.json({
    defaultCurrency: profile?.default_currency ?? DEFAULT_CURRENCY,
    reportingTimezone: getEffectiveReportingTimezone(profile?.reporting_timezone),
    displayAdvertCheckbox: profile?.display_advert_checkbox === true,
  });
}
