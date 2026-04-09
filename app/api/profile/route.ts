import { parseProfileSetupPayload } from "@/lib/profiles/profile-setup";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

interface ProfileEditRequestBody {
  displayName?: unknown;
  reportingTimezone?: unknown;
  payChairRent?: unknown;
  rentType?: unknown;
  fixedFrequency?: unknown;
  fixedAmountMinor?: unknown;
  commissionRateBps?: unknown;
  commissionCapped?: unknown;
  commissionCapFrequency?: unknown;
  commissionCapAmountMinor?: unknown;
}

export async function PUT(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to edit your profile.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to edit your profile." },
      { status: 401 },
    );
  }

  let body: ProfileEditRequestBody;
  try {
    body = (await request.json()) as ProfileEditRequestBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const { data: profileRows, error: profileFetchError } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("user_id", user.id)
    .limit(1);

  if (profileFetchError) {
    return NextResponse.json(
      { error: "Could not load current profile details." },
      { status: 500 },
    );
  }

  const currentProfile = profileRows?.[0];
  if (!currentProfile?.default_currency) {
    return NextResponse.json(
      { error: "Default currency is missing from profile setup." },
      { status: 409 },
    );
  }

  const candidatePayload = {
    displayName: body.displayName,
    defaultCurrency: currentProfile.default_currency,
    reportingTimezone: body.reportingTimezone,
    payChairRent: body.payChairRent,
    rentType: body.rentType,
    fixedFrequency: body.fixedFrequency,
    fixedAmountMinor: body.fixedAmountMinor,
    commissionRateBps: body.commissionRateBps,
    commissionCapped: body.commissionCapped,
    commissionCapFrequency: body.commissionCapFrequency,
    commissionCapAmountMinor: body.commissionCapAmountMinor,
  };
  const { data: parsedPayload, error: validationError } = parseProfileSetupPayload(candidatePayload);
  if (!parsedPayload || validationError) {
    return NextResponse.json(
      { error: validationError ?? "Profile edit payload is invalid." },
      { status: 400 },
    );
  }

  const { error: rolloverError } = await supabase.rpc("rollover_profile_compensation_version", {
    p_display_name: parsedPayload.displayName,
    p_reporting_timezone: parsedPayload.reportingTimezone,
    p_pay_chair_rent: parsedPayload.payChairRent,
    p_rent_type: parsedPayload.rentType,
    p_fixed_frequency: parsedPayload.fixedFrequency,
    p_fixed_amount_minor: parsedPayload.fixedAmountMinor,
    p_commission_rate_bps: parsedPayload.commissionRateBps,
    p_commission_capped: parsedPayload.commissionCapped,
    p_commission_cap_frequency: parsedPayload.commissionCapFrequency,
    p_commission_cap_amount_minor: parsedPayload.commissionCapAmountMinor,
  });

  if (rolloverError) {
    return NextResponse.json({ error: rolloverError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
