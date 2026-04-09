import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { parseProfileSetupPayload } from "@/lib/profiles/profile-setup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to set up your profile.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to set up your profile." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const { data: payload, error: validationError } = parseProfileSetupPayload(body);

  if (!payload || validationError) {
    return NextResponse.json(
      { error: validationError ?? "Profile setup payload is invalid." },
      { status: 400 },
    );
  }

  const { data: existingRows, error: profileFetchError } = await supabase
    .from("profiles")
    .select("default_currency,is_profile_complete")
    .eq("user_id", user.id)
    .limit(1);

  if (profileFetchError) {
    return NextResponse.json(
      { error: "Could not load current profile state." },
      { status: 500 },
    );
  }

  const existingProfile = existingRows?.[0];
  if (existingProfile?.is_profile_complete) {
    return NextResponse.json(
      { error: "Profile setup has already been completed." },
      { status: 409 },
    );
  }

  const { error: setupError } = await supabase.rpc("complete_profile_setup", {
    p_display_name: payload.displayName,
    p_default_currency: payload.defaultCurrency,
    p_reporting_timezone: payload.reportingTimezone,
    p_pay_chair_rent: payload.payChairRent,
    p_rent_type: payload.rentType,
    p_fixed_frequency: payload.fixedFrequency,
    p_fixed_amount_minor: payload.fixedAmountMinor,
    p_commission_rate_bps: payload.commissionRateBps,
    p_commission_capped: payload.commissionCapped,
    p_commission_cap_frequency: payload.commissionCapFrequency,
    p_commission_cap_amount_minor: payload.commissionCapAmountMinor,
  });

  if (setupError) {
    const status = setupError.message.includes("already been completed") ? 409 : 400;
    return NextResponse.json({ error: setupError.message }, { status });
  }

  return NextResponse.json({ success: true });
}
