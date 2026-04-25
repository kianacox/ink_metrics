-- Fix rollover_profile_compensation_version to handle same-day re-saves.
--
-- Bug: the original query required effective_from <= today_in_tz. After the
-- first profile save of a day, the open-ended version has effective_from =
-- tomorrow, so the query finds nothing → 400 "Active compensation settings are
-- missing." on every subsequent save within the same calendar day.
--
-- Fix: find the single open-ended version (effective_to IS NULL) regardless of
-- effective_from. If it starts in the future (same-day re-save), update its
-- settings in-place and keep the same effective date. Otherwise do the normal
-- rollover (close current, insert new for tomorrow).

CREATE OR REPLACE FUNCTION public.rollover_profile_compensation_version(
  p_display_name text,
  p_reporting_timezone text,
  p_pay_chair_rent boolean,
  p_rent_type text,
  p_fixed_frequency text,
  p_fixed_amount_minor bigint,
  p_commission_rate_bps integer,
  p_commission_capped boolean,
  p_commission_cap_frequency text,
  p_commission_cap_amount_minor bigint
)
RETURNS date
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  now_ts timestamp with time zone := now();
  active_version_id uuid;
  active_effective_from date;
  today_in_tz date;
  tomorrow_in_tz date;
  new_effective_from date;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to edit your profile.';
  END IF;

  today_in_tz := (now() AT TIME ZONE p_reporting_timezone)::date;
  tomorrow_in_tz := today_in_tz + 1;

  -- Find the single open-ended version. There is always exactly one per user
  -- (enforced by the exclusion constraint). No date filter — the version may
  -- already be a pending future version from an earlier save today.
  SELECT compensation_version_id, effective_from
  INTO active_version_id, active_effective_from
  FROM public.artist_compensation_versions
  WHERE user_id = current_user_id
    AND effective_to IS NULL
  ORDER BY effective_from DESC
  LIMIT 1;

  IF active_version_id IS NULL THEN
    RAISE EXCEPTION 'Active compensation settings are missing.';
  END IF;

  IF active_effective_from > today_in_tz THEN
    -- Same-day re-save: the open-ended version already starts in the future
    -- (created by an earlier save today). Keep the existing effective date and
    -- update settings in-place — no new row needed.
    new_effective_from := active_effective_from;

    UPDATE public.artist_compensation_versions
    SET
      pay_chair_rent = p_pay_chair_rent,
      rent_type = p_rent_type,
      fixed_frequency = p_fixed_frequency,
      fixed_amount_minor = p_fixed_amount_minor,
      commission_rate_bps = p_commission_rate_bps,
      commission_capped = p_commission_capped,
      commission_cap_frequency = p_commission_cap_frequency,
      commission_cap_amount_minor = p_commission_cap_amount_minor,
      updated_at = now_ts
    WHERE compensation_version_id = active_version_id;
  ELSE
    -- Normal case: current version is active today. Close it and create a new
    -- version starting tomorrow (or the day after the current start, if that
    -- is later — prevents a zero-width range on day-0 rollover).
    new_effective_from := greatest(tomorrow_in_tz, active_effective_from + 1);

    UPDATE public.artist_compensation_versions
    SET
      effective_to = new_effective_from,
      updated_at = now_ts
    WHERE compensation_version_id = active_version_id;

    INSERT INTO public.artist_compensation_versions (
      user_id,
      effective_from,
      effective_to,
      pay_chair_rent,
      rent_type,
      fixed_frequency,
      fixed_amount_minor,
      commission_rate_bps,
      commission_capped,
      commission_cap_frequency,
      commission_cap_amount_minor,
      updated_at
    )
    VALUES (
      current_user_id,
      new_effective_from,
      null,
      p_pay_chair_rent,
      p_rent_type,
      p_fixed_frequency,
      p_fixed_amount_minor,
      p_commission_rate_bps,
      p_commission_capped,
      p_commission_cap_frequency,
      p_commission_cap_amount_minor,
      now_ts
    );
  END IF;

  UPDATE public.profiles
  SET
    display_name = p_display_name,
    reporting_timezone = p_reporting_timezone
  WHERE user_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile row is missing.';
  END IF;

  RETURN new_effective_from;
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_profile_compensation_version(
  text, text, boolean, text, text, bigint, integer, boolean, text, bigint
) FROM public;

GRANT EXECUTE ON FUNCTION public.rollover_profile_compensation_version(
  text, text, boolean, text, text, bigint, integer, boolean, text, bigint
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.rollover_profile_compensation_version(
  text, text, boolean, text, text, bigint, integer, boolean, text, bigint
) TO service_role;
