import { parseProfileSetupPayload } from "@/lib/profiles/profile-setup";
import { createClient } from "@/lib/supabase/server";
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
  effectiveFrom?: unknown;
}

function parseEffectiveFrom(value: unknown): { value: string | null; error: string | null } {
  if (value === undefined || value === null || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string") {
    return { value: null, error: "Effective from timestamp is invalid." };
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return { value: null, error: "Effective from timestamp is invalid." };
  }

  return { value: new Date(timestamp).toISOString(), error: null };
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
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

  const parsedEffectiveFrom = parseEffectiveFrom(body.effectiveFrom);
  if (parsedEffectiveFrom.error) {
    return NextResponse.json({ error: parsedEffectiveFrom.error }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const effectiveFrom = parsedEffectiveFrom.value ?? nowIso;
  const nowTimestamp = Date.parse(nowIso);
  const nextEffectiveFromTimestamp = Date.parse(effectiveFrom);
  if (
    Number.isFinite(nextEffectiveFromTimestamp) &&
    Number.isFinite(nowTimestamp) &&
    nextEffectiveFromTimestamp > nowTimestamp
  ) {
    return NextResponse.json(
      { error: "Effective from timestamp cannot be in the future." },
      { status: 400 },
    );
  }

  const { data: activeRows, error: activeCompensationError } = await supabase
    .from("artist_compensation_versions")
    .select("compensation_version_id,effective_from")
    .eq("user_id", user.id)
    .is("effective_to", null)
    .lte("effective_from", nowIso)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (activeCompensationError) {
    return NextResponse.json(
      { error: "Could not load active compensation settings." },
      { status: 500 },
    );
  }

  const activeVersion = activeRows?.[0];
  if (!activeVersion?.compensation_version_id) {
    return NextResponse.json(
      { error: "Active compensation settings are missing." },
      { status: 409 },
    );
  }

  const activeEffectiveFromTimestamp = Date.parse(activeVersion.effective_from);
  if (
    Number.isFinite(activeEffectiveFromTimestamp) &&
    Number.isFinite(nextEffectiveFromTimestamp) &&
    nextEffectiveFromTimestamp <= activeEffectiveFromTimestamp
  ) {
    return NextResponse.json(
      { error: "Effective from timestamp must be after the current active version start." },
      { status: 400 },
    );
  }

  const { error: rolloverError } = await supabase.rpc("rollover_profile_compensation_version", {
    p_effective_from: effectiveFrom,
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
