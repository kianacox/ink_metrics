import { createClient } from "@/lib/supabase/server";
import { parseProfileSetupPayload } from "@/lib/profiles/profile-setup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to set up your profile." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
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

  const nowIso = new Date().toISOString();
  const compensationPayload = {
    user_id: user.id,
    pay_chair_rent: payload.payChairRent,
    rent_type: payload.rentType,
    fixed_frequency: payload.fixedFrequency,
    fixed_amount_minor: payload.fixedAmountMinor,
    commission_rate_bps: payload.commissionRateBps,
    commission_capped: payload.commissionCapped,
    commission_cap_frequency: payload.commissionCapFrequency,
    commission_cap_amount_minor: payload.commissionCapAmountMinor,
    updated_at: nowIso,
  };
  const { data: existingCompensationRows, error: existingCompensationError } = await supabase
    .from("artist_compensation_versions")
    .select("compensation_version_id")
    .eq("user_id", user.id)
    .is("effective_to", null)
    .limit(1);

  if (existingCompensationError) {
    return NextResponse.json(
      { error: "Could not load current compensation state." },
      { status: 500 },
    );
  }

  const existingCompensationVersionId = existingCompensationRows?.[0]?.compensation_version_id;
  const compensationError = existingCompensationVersionId
    ? (
        await supabase
          .from("artist_compensation_versions")
          .update(compensationPayload)
          .eq("compensation_version_id", existingCompensationVersionId)
      ).error
    : (
        await supabase
          .from("artist_compensation_versions")
          .insert({
            ...compensationPayload,
            effective_from: nowIso,
            effective_to: null,
          })
      ).error;

  if (compensationError) {
    return NextResponse.json({ error: compensationError.message }, { status: 400 });
  }

  const { error: profileUpdateError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: payload.displayName,
      default_currency: payload.defaultCurrency,
      reporting_timezone: payload.reportingTimezone,
      is_profile_complete: true,
      profile_completed_at: nowIso,
    },
    {
      onConflict: "user_id",
    },
  );

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
