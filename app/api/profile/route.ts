import { fetchProfileSettings } from "@/lib/profiles/fetch-profile-settings";
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

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function GET() {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to view your profile.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view your profile." },
      { status: 401 },
    );
  }

  const settings = await fetchProfileSettings({
    supabase,
    userId: user.id,
  });

  if (!settings) {
    return NextResponse.json(
      { error: "Profile setup is incomplete." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    email: user.email ?? "",
    ...settings,
  });
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
    .select("default_currency,marketing_consent")
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
    // Marketing consent is managed separately via PATCH; pass the existing
    // value through so parseProfileSetupPayload validation succeeds.
    marketingConsent: currentProfile.marketing_consent ?? false,
  };
  const { data: parsedPayload, error: validationError } = parseProfileSetupPayload(candidatePayload);
  if (!parsedPayload || validationError) {
    return NextResponse.json(
      { error: validationError ?? "Profile edit payload is invalid." },
      { status: 400 },
    );
  }

  const { data: newEffectiveFrom, error: rolloverError } = await supabase.rpc(
    "rollover_profile_compensation_version",
    {
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
    },
  );

  if (rolloverError) {
    return errorJson(400, "PROFILE_UPDATE_FAILED", "Could not update profile.");
  }

  return NextResponse.json({ success: true, effectiveFrom: newEffectiveFrom as string });
}

export async function PATCH(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to update your profile.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to update your profile." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.marketingConsent !== "boolean") {
    return NextResponse.json(
      { error: "Marketing consent must be a boolean." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase.rpc("update_profile_marketing_consent", {
    p_marketing_consent: body.marketingConsent,
  });

  if (updateError) {
    return errorJson(400, "MARKETING_CONSENT_UPDATE_FAILED", "Could not update marketing preferences.");
  }

  return NextResponse.json({ success: true });
}
