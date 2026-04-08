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

  const body = (await request.json()) as unknown;
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

  const { error: compensationError } = await supabase
    .from("artist_compensation_settings")
    .upsert(
      {
        user_id: user.id,
        pay_chair_rent: payload.payChairRent,
        rent_type: payload.rentType,
        fixed_frequency: payload.fixedFrequency,
        fixed_amount_minor: payload.fixedAmountMinor,
        commission_rate_bps: payload.commissionRateBps,
        commission_capped: payload.commissionCapped,
        commission_cap_frequency: payload.commissionCapFrequency,
        commission_cap_amount_minor: payload.commissionCapAmountMinor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (compensationError) {
    return NextResponse.json({ error: compensationError.message }, { status: 400 });
  }

  const { error: profileUpdateError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: payload.displayName,
      default_currency: payload.defaultCurrency,
      is_profile_complete: true,
      profile_completed_at: new Date().toISOString(),
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
