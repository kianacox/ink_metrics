-- Migration: convert session_at to date, drop session_duration, date-based compensation versions

-- =============================================================================
-- A. sessions.session_at: timestamptz → date
-- =============================================================================

-- Drop duration-sort index first (references session_duration which we're about to drop)
DROP INDEX IF EXISTS sessions_user_session_duration_session_id_idx;

-- PostgreSQL does not allow subqueries in USING clauses.
-- Use a temporary column approach: compute the date value using a JOIN-based UPDATE,
-- then swap the columns.
ALTER TABLE public.sessions ADD COLUMN session_at_date date;

UPDATE public.sessions s
SET session_at_date = (
  s.session_at AT TIME ZONE coalesce(p.reporting_timezone, 'UTC')
)::date
FROM public.profiles p
WHERE p.user_id = s.user_id;

-- Handle sessions with no profile (shouldn't exist but be safe)
UPDATE public.sessions
SET session_at_date = session_at::date
WHERE session_at_date IS NULL;

ALTER TABLE public.sessions DROP COLUMN session_at;
ALTER TABLE public.sessions RENAME COLUMN session_at_date TO session_at;
ALTER TABLE public.sessions ALTER COLUMN session_at SET NOT NULL;

-- =============================================================================
-- B. Drop session_duration
-- =============================================================================

ALTER TABLE public.sessions DROP COLUMN IF EXISTS session_duration;

-- =============================================================================
-- C. artist_compensation_versions: convert timestamps to date
-- =============================================================================

-- Drop the tstzrange exclusion constraint first
ALTER TABLE public.artist_compensation_versions
  DROP CONSTRAINT IF EXISTS artist_compensation_versions_no_overlap_excl;

-- Convert effective_from (use temp column approach due to subquery restriction in USING)
ALTER TABLE public.artist_compensation_versions ADD COLUMN effective_from_date date;

UPDATE public.artist_compensation_versions acv
SET effective_from_date = (
  acv.effective_from AT TIME ZONE coalesce(p.reporting_timezone, 'UTC')
)::date
FROM public.profiles p
WHERE p.user_id = acv.user_id;

UPDATE public.artist_compensation_versions
SET effective_from_date = effective_from::date
WHERE effective_from_date IS NULL;

ALTER TABLE public.artist_compensation_versions DROP COLUMN effective_from;
ALTER TABLE public.artist_compensation_versions RENAME COLUMN effective_from_date TO effective_from;
ALTER TABLE public.artist_compensation_versions ALTER COLUMN effective_from SET NOT NULL;

-- Convert effective_to (nullable, use temp column approach)
ALTER TABLE public.artist_compensation_versions ADD COLUMN effective_to_date date;

UPDATE public.artist_compensation_versions acv
SET effective_to_date = (
  acv.effective_to AT TIME ZONE coalesce(p.reporting_timezone, 'UTC')
)::date
FROM public.profiles p
WHERE p.user_id = acv.user_id
  AND acv.effective_to IS NOT NULL;

-- effective_to_date stays NULL where effective_to was NULL (correct)

ALTER TABLE public.artist_compensation_versions DROP COLUMN effective_to;
ALTER TABLE public.artist_compensation_versions RENAME COLUMN effective_to_date TO effective_to;

-- Fix any same-day collisions where effective_from = effective_to after date truncation
UPDATE public.artist_compensation_versions
SET effective_to = effective_from - 1
WHERE effective_to IS NOT NULL AND effective_to <= effective_from;

-- Recreate exclusion constraint using daterange
ALTER TABLE public.artist_compensation_versions
  ADD CONSTRAINT artist_compensation_versions_no_overlap_excl
  EXCLUDE USING gist (
    user_id WITH =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[)') WITH &&
  );

-- Update range check constraint for date types
ALTER TABLE public.artist_compensation_versions
  DROP CONSTRAINT IF EXISTS artist_compensation_versions_effective_range_check;
ALTER TABLE public.artist_compensation_versions
  ADD CONSTRAINT artist_compensation_versions_effective_range_check
  CHECK (effective_to IS NULL OR effective_to > effective_from);

-- =============================================================================
-- D. Drop and recreate create_session_with_optional_client
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  integer,
  timestamp with time zone,
  boolean,
  boolean
);

CREATE OR REPLACE FUNCTION public.create_session_with_optional_client(
  p_selected_client_id uuid,
  p_create_new_client boolean,
  p_client_name text,
  p_client_contact text,
  p_price_minor bigint,
  p_session_at date,
  p_through_ads boolean default null,
  p_in_progress boolean default false
)
RETURNS TABLE (
  session_id uuid,
  created_client_id uuid,
  created_client_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  resolved_client_id uuid;
  inserted_session_id uuid;
  active_compensation_version_id uuid;
  profile_allows_advert_checkbox boolean := false;
  normalized_client_name text := btrim(coalesce(p_client_name, ''));
  normalized_client_contact text := nullif(btrim(coalesce(p_client_contact, '')), '');
  normalized_through_ads boolean;
  normalized_client_origin text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to log a session.';
  END IF;

  SELECT coalesce(display_advert_checkbox, false)
  INTO profile_allows_advert_checkbox
  FROM public.profiles
  WHERE user_id = current_user_id
  LIMIT 1;

  IF profile_allows_advert_checkbox AND p_create_new_client THEN
    normalized_through_ads := coalesce(p_through_ads, false);
  ELSE
    normalized_through_ads := null;
  END IF;

  IF p_create_new_client THEN
    IF normalized_client_name = '' THEN
      RAISE EXCEPTION 'Client name is required for a new client.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.clients
      WHERE user_id = current_user_id
        AND lower(btrim(name)) = lower(normalized_client_name)
    ) THEN
      RAISE EXCEPTION 'A client with this name already exists. Choose it from Existing client.';
    END IF;

    IF profile_allows_advert_checkbox THEN
      normalized_client_origin := CASE
        WHEN normalized_through_ads THEN 'advertising'
        ELSE 'organic'
      END;
    ELSE
      normalized_client_origin := null;
    END IF;

    INSERT INTO public.clients (
      client_id,
      user_id,
      name,
      contact_info,
      origin
    )
    VALUES (
      gen_random_uuid(),
      current_user_id,
      normalized_client_name,
      normalized_client_contact,
      normalized_client_origin
    )
    RETURNING client_id, name
    INTO resolved_client_id, created_client_name;

    created_client_id := resolved_client_id;
  ELSE
    IF p_selected_client_id IS NULL THEN
      RAISE EXCEPTION 'Select an existing client before saving.';
    END IF;

    SELECT client_id
    INTO resolved_client_id
    FROM public.clients
    WHERE user_id = current_user_id
      AND client_id = p_selected_client_id
    LIMIT 1;

    IF resolved_client_id IS NULL THEN
      RAISE EXCEPTION 'Selected client was not found.';
    END IF;

    created_client_id := null;
    created_client_name := null;
  END IF;

  SELECT compensation_version_id
  INTO active_compensation_version_id
  FROM public.artist_compensation_versions
  WHERE user_id = current_user_id
    AND effective_from <= p_session_at
    AND (effective_to IS NULL OR effective_to > p_session_at)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF active_compensation_version_id IS NULL THEN
    RAISE EXCEPTION 'No compensation settings are active for this session date.';
  END IF;

  INSERT INTO public.sessions (
    session_id,
    user_id,
    client_id,
    price,
    session_at,
    compensation_version_id,
    through_ads,
    in_progress
  )
  VALUES (
    gen_random_uuid(),
    current_user_id,
    resolved_client_id,
    p_price_minor,
    p_session_at,
    active_compensation_version_id,
    normalized_through_ads,
    coalesce(p_in_progress, false)
  )
  RETURNING public.sessions.session_id
  INTO inserted_session_id;

  session_id := inserted_session_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  date,
  boolean,
  boolean
) FROM public;

GRANT EXECUTE ON FUNCTION public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  date,
  boolean,
  boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_session_with_optional_client(
  uuid,
  boolean,
  text,
  text,
  bigint,
  date,
  boolean,
  boolean
) TO service_role;

-- =============================================================================
-- E. Drop and recreate update_owned_session
-- =============================================================================

DROP FUNCTION IF EXISTS public.update_owned_session(
  uuid,
  bigint,
  integer,
  timestamp with time zone,
  boolean
);

CREATE OR REPLACE FUNCTION public.update_owned_session(
  p_session_id uuid,
  p_price_minor bigint,
  p_session_at date,
  p_in_progress boolean default false
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  active_compensation_version_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to update a session.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sessions
    WHERE session_id = p_session_id
      AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Session was not found.';
  END IF;

  SELECT compensation_version_id
  INTO active_compensation_version_id
  FROM public.artist_compensation_versions
  WHERE user_id = current_user_id
    AND effective_from <= p_session_at
    AND (effective_to IS NULL OR effective_to > p_session_at)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF active_compensation_version_id IS NULL THEN
    RAISE EXCEPTION 'No compensation settings are active for this session date.';
  END IF;

  UPDATE public.sessions
  SET
    price = p_price_minor,
    session_at = p_session_at,
    compensation_version_id = active_compensation_version_id,
    in_progress = coalesce(p_in_progress, false)
  WHERE session_id = p_session_id
    AND user_id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_owned_session(
  uuid,
  bigint,
  date,
  boolean
) FROM public;

GRANT EXECUTE ON FUNCTION public.update_owned_session(
  uuid,
  bigint,
  date,
  boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_owned_session(
  uuid,
  bigint,
  date,
  boolean
) TO service_role;

-- =============================================================================
-- F. Drop and recreate rollover_profile_compensation_version
-- =============================================================================

DROP FUNCTION IF EXISTS public.rollover_profile_compensation_version(
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint
);

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

  SELECT compensation_version_id, effective_from
  INTO active_version_id, active_effective_from
  FROM public.artist_compensation_versions
  WHERE user_id = current_user_id
    AND effective_to IS NULL
    AND effective_from <= today_in_tz
  ORDER BY effective_from DESC
  LIMIT 1;

  IF active_version_id IS NULL THEN
    RAISE EXCEPTION 'Active compensation settings are missing.';
  END IF;

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

  UPDATE public.profiles
  SET
    display_name = p_display_name,
    reporting_timezone = p_reporting_timezone,
    updated_at = now_ts
  WHERE user_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile row is missing.';
  END IF;

  RETURN new_effective_from;
END;
$$;

REVOKE ALL ON FUNCTION public.rollover_profile_compensation_version(
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint
) FROM public;

GRANT EXECUTE ON FUNCTION public.rollover_profile_compensation_version(
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.rollover_profile_compensation_version(
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint
) TO service_role;

-- =============================================================================
-- G. Drop and recreate complete_profile_setup
-- =============================================================================

DROP FUNCTION IF EXISTS public.complete_profile_setup(
  text,
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint,
  boolean
);

CREATE OR REPLACE FUNCTION public.complete_profile_setup(
  p_display_name text,
  p_default_currency text,
  p_reporting_timezone text,
  p_pay_chair_rent boolean,
  p_rent_type text,
  p_fixed_frequency text,
  p_fixed_amount_minor bigint,
  p_commission_rate_bps integer,
  p_commission_capped boolean,
  p_commission_cap_frequency text,
  p_commission_cap_amount_minor bigint,
  p_marketing_consent boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  now_ts timestamp with time zone := now();
  existing_profile_is_complete boolean := false;
  active_version_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to set up your profile.';
  END IF;

  SELECT is_profile_complete
  INTO existing_profile_is_complete
  FROM public.profiles
  WHERE user_id = current_user_id
  LIMIT 1;

  IF coalesce(existing_profile_is_complete, false) THEN
    RAISE EXCEPTION 'Profile setup has already been completed.';
  END IF;

  SELECT compensation_version_id
  INTO active_version_id
  FROM public.artist_compensation_versions
  WHERE user_id = current_user_id
    AND effective_to IS NULL
  LIMIT 1;

  IF active_version_id IS NULL THEN
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
      (now_ts AT TIME ZONE p_reporting_timezone)::date - interval '6 months',
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
  ELSE
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
  END IF;

  INSERT INTO public.profiles (
    user_id,
    display_name,
    default_currency,
    reporting_timezone,
    marketing_consent,
    is_profile_complete,
    profile_completed_at
  )
  VALUES (
    current_user_id,
    p_display_name,
    p_default_currency,
    p_reporting_timezone,
    p_marketing_consent,
    true,
    now_ts
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    display_name = excluded.display_name,
    default_currency = excluded.default_currency,
    reporting_timezone = excluded.reporting_timezone,
    marketing_consent = excluded.marketing_consent,
    is_profile_complete = true,
    profile_completed_at = excluded.profile_completed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_profile_setup(
  text,
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint,
  boolean
) FROM public;

GRANT EXECUTE ON FUNCTION public.complete_profile_setup(
  text,
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint,
  boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.complete_profile_setup(
  text,
  text,
  text,
  boolean,
  text,
  text,
  bigint,
  integer,
  boolean,
  text,
  bigint,
  boolean
) TO service_role;

-- =============================================================================
-- H. Update compute_dashboard_take_home_summary
-- Drop required because return type changed (session_count added in prev migration)
-- =============================================================================

DROP FUNCTION IF EXISTS public.compute_dashboard_take_home_summary(
  uuid,
  timestamp with time zone,
  timestamp with time zone,
  text,
  date,
  date
);

CREATE FUNCTION public.compute_dashboard_take_home_summary(
  p_user_id uuid,
  p_month_start_utc timestamp with time zone,
  p_month_end_utc timestamp with time zone,
  p_reporting_timezone text,
  p_month_start_local_date date,
  p_month_end_local_date date
)
RETURNS TABLE (
  gross_minor bigint,
  paid_to_studio_minor bigint,
  total_expenses_minor bigint,
  net_minor bigint,
  session_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to view dashboard analytics.';
  END IF;

  IF p_user_id IS NULL OR p_user_id <> current_user_id THEN
    RAISE EXCEPTION 'Not authorized to read dashboard analytics for this user.';
  END IF;

  IF p_reporting_timezone IS NULL OR btrim(p_reporting_timezone) = '' THEN
    RAISE EXCEPTION 'A reporting timezone is required.';
  END IF;

  IF p_month_start_utc IS NULL
     OR p_month_end_utc IS NULL
     OR p_month_end_utc <= p_month_start_utc THEN
    RAISE EXCEPTION 'Invalid month window.';
  END IF;

  IF p_month_start_local_date IS NULL
     OR p_month_end_local_date IS NULL
     OR p_month_end_local_date <= p_month_start_local_date THEN
    RAISE EXCEPTION 'Invalid local month window.';
  END IF;

  RETURN QUERY
  WITH resolved_sessions AS (
    SELECT
      coalesce(s.price, 0)::bigint AS price_minor,
      s.session_at::timestamp AS local_session_at,
      coalesce(version_by_id.pay_chair_rent, version_fallback.pay_chair_rent, false) AS pay_chair_rent,
      coalesce(version_by_id.rent_type, version_fallback.rent_type) AS rent_type,
      coalesce(version_by_id.fixed_frequency, version_fallback.fixed_frequency) AS fixed_frequency,
      coalesce(version_by_id.fixed_amount_minor, version_fallback.fixed_amount_minor) AS fixed_amount_minor,
      coalesce(version_by_id.commission_rate_bps, version_fallback.commission_rate_bps) AS commission_rate_bps,
      coalesce(version_by_id.commission_capped, version_fallback.commission_capped, false) AS commission_capped,
      coalesce(version_by_id.commission_cap_frequency, version_fallback.commission_cap_frequency) AS commission_cap_frequency,
      coalesce(version_by_id.commission_cap_amount_minor, version_fallback.commission_cap_amount_minor) AS commission_cap_amount_minor,
      coalesce(
        version_by_id.compensation_version_id,
        version_fallback.compensation_version_id
      ) AS resolved_compensation_version_id
    FROM public.sessions AS s
    LEFT JOIN public.artist_compensation_versions AS version_by_id
      ON version_by_id.compensation_version_id = s.compensation_version_id
    LEFT JOIN LATERAL (
      SELECT
        version_rows.compensation_version_id,
        version_rows.pay_chair_rent,
        version_rows.rent_type,
        version_rows.fixed_frequency,
        version_rows.fixed_amount_minor,
        version_rows.commission_rate_bps,
        version_rows.commission_capped,
        version_rows.commission_cap_frequency,
        version_rows.commission_cap_amount_minor
      FROM public.artist_compensation_versions AS version_rows
      WHERE s.compensation_version_id IS NULL
        AND version_rows.user_id = s.user_id
        AND version_rows.effective_from <= s.session_at
        AND (
          version_rows.effective_to IS NULL
          OR s.session_at < version_rows.effective_to
        )
      ORDER BY version_rows.effective_from DESC
      LIMIT 1
    ) AS version_fallback ON true
    WHERE s.user_id = p_user_id
      AND s.session_at >= p_month_start_local_date
      AND s.session_at < p_month_end_local_date
  ),
  session_count_total AS (
    SELECT count(*)::bigint AS session_count
    FROM resolved_sessions
  ),
  gross_total AS (
    SELECT coalesce(sum(price_minor), 0)::bigint AS gross_minor
    FROM resolved_sessions
  ),
  commission_buckets AS (
    SELECT
      resolved_compensation_version_id AS compensation_bucket_id,
      CASE
        WHEN commission_capped AND commission_cap_frequency = 'weekly'
          THEN date_trunc('week', local_session_at)::date
        ELSE date_trunc('month', local_session_at)::date
      END AS period_bucket_start,
      commission_rate_bps,
      commission_capped,
      commission_cap_amount_minor,
      sum(price_minor)::bigint AS period_gross_minor
    FROM resolved_sessions
    WHERE pay_chair_rent
      AND rent_type = 'commission'
      AND commission_rate_bps IS NOT NULL
    GROUP BY
      compensation_bucket_id,
      period_bucket_start,
      commission_rate_bps,
      commission_capped,
      commission_cap_amount_minor
  ),
  commission_deductions AS (
    SELECT coalesce(
      sum(
        CASE
          WHEN commission_capped
            THEN least(
              floor((period_gross_minor::numeric * commission_rate_bps::numeric) / 10000)::bigint,
              coalesce(commission_cap_amount_minor, 0)
            )
          ELSE floor((period_gross_minor::numeric * commission_rate_bps::numeric) / 10000)::bigint
        END
      ),
      0
    )::bigint AS paid_minor
    FROM commission_buckets
  ),
  fixed_buckets AS (
    SELECT DISTINCT
      resolved_compensation_version_id AS compensation_bucket_id,
      CASE
        WHEN fixed_frequency = 'weekly'
          THEN date_trunc('week', local_session_at)::date
        ELSE date_trunc('month', local_session_at)::date
      END AS period_bucket_start,
      fixed_amount_minor
    FROM resolved_sessions
    WHERE pay_chair_rent
      AND rent_type = 'fixed'
      AND fixed_frequency IN ('weekly', 'monthly')
      AND fixed_amount_minor IS NOT NULL
  ),
  fixed_deductions AS (
    SELECT coalesce(sum(fixed_amount_minor), 0)::bigint AS paid_minor
    FROM fixed_buckets
  ),
  paid_to_studio_total AS (
    SELECT
      (coalesce((SELECT paid_minor FROM commission_deductions), 0)
      + coalesce((SELECT paid_minor FROM fixed_deductions), 0))::bigint AS paid_to_studio_minor
  ),
  expense_total AS (
    SELECT
      coalesce(sum(e.amount_minor), 0)::bigint AS total_expenses_minor
    FROM public.expenses AS e
    WHERE e.user_id = p_user_id
      AND e.date_purchased >= p_month_start_local_date
      AND e.date_purchased < p_month_end_local_date
  )
  SELECT
    gross_total.gross_minor,
    paid_to_studio_total.paid_to_studio_minor,
    expense_total.total_expenses_minor,
    (
      gross_total.gross_minor
      - paid_to_studio_total.paid_to_studio_minor
      - expense_total.total_expenses_minor
    )::bigint AS net_minor,
    session_count_total.session_count
  FROM gross_total
  CROSS JOIN paid_to_studio_total
  CROSS JOIN expense_total
  CROSS JOIN session_count_total;
END;
$$;

-- Note: compute_dashboard_client_retention was dropped in 20260417180000_slice5_lifetime_client_retention_rpc.sql
-- and replaced with compute_lifetime_client_retention (which does not filter by session_at date range).
-- No update needed for that function.

