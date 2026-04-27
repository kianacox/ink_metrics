# Date-Only Session Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace timestamp-based session logging with date-only logging, remove session duration/hours worked, and change compensation settings to apply at midnight of the next calendar day.

**Architecture:** Single DB migration converts `sessions.session_at` from `timestamptz` to `date`, drops `session_duration`, converts `artist_compensation_versions.effective_from/to` to `date`. All RPCs are updated in the same migration. TypeScript models and UI components are updated top-down: wire models → API routes → form validation → form UI → list UI → profile UI. All date logic uses the user's `reporting_timezone` stored in `profiles`.

**Tech Stack:** PostgreSQL (Supabase), Next.js App Router, TypeScript, shadcn/ui (Calendar + Popover), luxon (already in project), Jest, Playwright.

---

## File Map

**Created:**
- `supabase/migrations/TIMESTAMP_date_only_sessions.sql`

**Modified:**
- `supabase/seed.sql`
- `lib/sessions/models/session-write-models.ts`
- `lib/sessions/session-write.ts`
- `lib/sessions/session-write.test.ts`
- `lib/sessions/fetch-sessions-page.ts`
- `lib/sessions/fetch-sessions-page.test.ts`
- `lib/clients/fetch-clients-page.ts`
- `app/api/sessions/route.ts`
- `app/api/sessions/[sessionId]/route.ts`
- `app/api/profile/route.ts`
- `components/dashboard/sessions/utils/session-listing.ts`
- `components/dashboard/sessions/utils/session-formatting.ts`
- `components/dashboard/sessions/utils/session-formatting.test.ts`
- `components/dashboard/sessions/hooks/use-sessions-pagination.test.ts`
- `components/dashboard/sessions/sessions-table.tsx`
- `components/dashboard/sessions/sessions-cards.tsx`
- `components/dashboard/sessions/sessions-view.tsx`
- `components/dashboard/sessions/session-edit-modal.tsx`
- `components/dashboard/session-form/session-editable-fields.tsx`
- `components/dashboard/session-form/utils/session-form-validation.ts`
- `components/dashboard/session-form/utils/session-form-validation.test.ts`
- `components/dashboard/session-form/models/session-form-data-models.ts`
- `components/dashboard/session-form/hooks/use-session-form-data.ts`
- `components/dashboard/session-form/add-session-modal.tsx`
- `components/dashboard/profile/profile-edit-form.tsx`

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260422100000_date_only_sessions.sql`
- Modify: `supabase/seed.sql`

This migration must run without data loss. It converts timestamps to dates using each user's `reporting_timezone`, drops `session_duration`, recreates the overlap exclusion constraint with `daterange`, and updates all RPCs that reference these columns.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260422100000_date_only_sessions.sql

-- ============================================================
-- 1. sessions.session_at: timestamptz → date
-- ============================================================

-- Drop the duration sort index before dropping the column
DROP INDEX IF EXISTS sessions_user_session_duration_session_id_idx;

-- Convert session_at to date using each user's reporting_timezone
ALTER TABLE public.sessions
  ALTER COLUMN session_at TYPE date
  USING (
    session_at AT TIME ZONE coalesce(
      (SELECT reporting_timezone FROM public.profiles WHERE user_id = sessions.user_id LIMIT 1),
      'UTC'
    )
  )::date;

-- ============================================================
-- 2. sessions.session_duration: DROP
-- ============================================================

ALTER TABLE public.sessions DROP COLUMN IF EXISTS session_duration;

-- ============================================================
-- 3. artist_compensation_versions: effective_from/to → date
-- ============================================================

-- Drop the tstzrange exclusion constraint before altering column types
ALTER TABLE public.artist_compensation_versions
  DROP CONSTRAINT IF EXISTS artist_compensation_versions_no_overlap_excl;

-- Convert effective_from to date
ALTER TABLE public.artist_compensation_versions
  ALTER COLUMN effective_from TYPE date
  USING (
    effective_from AT TIME ZONE coalesce(
      (SELECT reporting_timezone FROM public.profiles WHERE user_id = artist_compensation_versions.user_id LIMIT 1),
      'UTC'
    )
  )::date;

-- Convert effective_to to date (nullable)
ALTER TABLE public.artist_compensation_versions
  ALTER COLUMN effective_to TYPE date
  USING (
    effective_to AT TIME ZONE coalesce(
      (SELECT reporting_timezone FROM public.profiles WHERE user_id = artist_compensation_versions.user_id LIMIT 1),
      'UTC'
    )
  )::date;

-- Fix any same-day collisions in effective_from/effective_to caused by the conversion
-- (if two versions ended up with effective_from = effective_to after date truncation,
-- close the older one one day earlier)
UPDATE public.artist_compensation_versions acv
SET effective_to = effective_from - 1
FROM (
  SELECT compensation_version_id
  FROM public.artist_compensation_versions
  WHERE effective_to IS NOT NULL AND effective_to <= effective_from
) sub
WHERE acv.compensation_version_id = sub.compensation_version_id;

-- Recreate the exclusion constraint using daterange
ALTER TABLE public.artist_compensation_versions
  ADD CONSTRAINT artist_compensation_versions_no_overlap_excl
  EXCLUDE USING gist (
    user_id WITH =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[)') WITH &&
  );

-- Update range check constraint
ALTER TABLE public.artist_compensation_versions
  DROP CONSTRAINT IF EXISTS artist_compensation_versions_effective_range_check;
ALTER TABLE public.artist_compensation_versions
  ADD CONSTRAINT artist_compensation_versions_effective_range_check
  CHECK (effective_to IS NULL OR effective_to > effective_from);

-- ============================================================
-- 4. create_session_with_optional_client: remove duration param, date session_at
-- ============================================================

DROP FUNCTION IF EXISTS public.create_session_with_optional_client(
  uuid, boolean, text, text, bigint, integer, timestamp with time zone, boolean, boolean
);

CREATE OR REPLACE FUNCTION public.create_session_with_optional_client(
  p_selected_client_id uuid,
  p_create_new_client boolean,
  p_client_name text,
  p_client_contact text,
  p_price_minor bigint,
  p_session_at date,
  p_through_ads boolean DEFAULT NULL,
  p_in_progress boolean DEFAULT false
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
    normalized_through_ads := NULL;
  END IF;

  IF p_create_new_client THEN
    IF normalized_client_name = '' THEN
      RAISE EXCEPTION 'Client name is required for a new client.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.clients
      WHERE user_id = current_user_id
        AND lower(btrim(name)) = lower(normalized_client_name)
    ) THEN
      RAISE EXCEPTION 'A client with this name already exists. Choose it from Existing client.';
    END IF;

    IF profile_allows_advert_checkbox THEN
      normalized_client_origin := CASE WHEN normalized_through_ads THEN 'advertising' ELSE 'organic' END;
    ELSE
      normalized_client_origin := NULL;
    END IF;

    INSERT INTO public.clients (client_id, user_id, name, contact_info, origin)
    VALUES (gen_random_uuid(), current_user_id, normalized_client_name, normalized_client_contact, normalized_client_origin)
    RETURNING client_id, name INTO resolved_client_id, created_client_name;

    created_client_id := resolved_client_id;
  ELSE
    IF p_selected_client_id IS NULL THEN
      RAISE EXCEPTION 'Select an existing client before saving.';
    END IF;

    SELECT client_id INTO resolved_client_id
    FROM public.clients
    WHERE user_id = current_user_id AND client_id = p_selected_client_id
    LIMIT 1;

    IF resolved_client_id IS NULL THEN
      RAISE EXCEPTION 'Selected client was not found.';
    END IF;

    created_client_id := NULL;
    created_client_name := NULL;
  END IF;

  SELECT compensation_version_id INTO active_compensation_version_id
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
    session_id, user_id, client_id, price, session_at,
    compensation_version_id, through_ads, in_progress
  )
  VALUES (
    gen_random_uuid(), current_user_id, resolved_client_id, p_price_minor, p_session_at,
    active_compensation_version_id, normalized_through_ads, coalesce(p_in_progress, false)
  )
  RETURNING public.sessions.session_id INTO inserted_session_id;

  session_id := inserted_session_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_session_with_optional_client(
  uuid, boolean, text, text, bigint, date, boolean, boolean
) FROM public;
GRANT EXECUTE ON FUNCTION public.create_session_with_optional_client(
  uuid, boolean, text, text, bigint, date, boolean, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_with_optional_client(
  uuid, boolean, text, text, bigint, date, boolean, boolean
) TO service_role;

-- ============================================================
-- 5. update_owned_session: remove duration param, date session_at
-- ============================================================

DROP FUNCTION IF EXISTS public.update_owned_session(
  uuid, bigint, integer, timestamp with time zone, boolean
);

CREATE OR REPLACE FUNCTION public.update_owned_session(
  p_session_id uuid,
  p_price_minor bigint,
  p_session_at date,
  p_in_progress boolean DEFAULT false
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
    SELECT 1 FROM public.sessions
    WHERE session_id = p_session_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Session was not found.';
  END IF;

  SELECT compensation_version_id INTO active_compensation_version_id
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
  WHERE session_id = p_session_id AND user_id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_owned_session(uuid, bigint, date, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.update_owned_session(uuid, bigint, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_owned_session(uuid, bigint, date, boolean) TO service_role;

-- ============================================================
-- 6. rollover_profile_compensation_version: apply next calendar day
--    Returns the new effective_from date for UI feedback.
-- ============================================================

DROP FUNCTION IF EXISTS public.rollover_profile_compensation_version(
  text, text, boolean, text, text, bigint, integer, boolean, text, bigint
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
  today_in_tz date := (now_ts AT TIME ZONE p_reporting_timezone)::date;
  tomorrow_in_tz date := today_in_tz + 1;
  active_version_id uuid;
  active_effective_from date;
  new_effective_from date;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to edit your profile.';
  END IF;

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

  -- New settings apply on the next calendar day (or day after current version start if later)
  new_effective_from := greatest(tomorrow_in_tz, active_effective_from + 1);

  UPDATE public.profiles
  SET display_name = p_display_name, reporting_timezone = p_reporting_timezone, updated_at = now_ts
  WHERE user_id = current_user_id;

  UPDATE public.artist_compensation_versions
  SET effective_to = new_effective_from, updated_at = now_ts
  WHERE compensation_version_id = active_version_id;

  INSERT INTO public.artist_compensation_versions (
    user_id, effective_from, effective_to,
    pay_chair_rent, rent_type, fixed_frequency, fixed_amount_minor,
    commission_rate_bps, commission_capped, commission_cap_frequency,
    commission_cap_amount_minor, updated_at
  )
  VALUES (
    current_user_id, new_effective_from, NULL,
    p_pay_chair_rent, p_rent_type, p_fixed_frequency, p_fixed_amount_minor,
    p_commission_rate_bps, p_commission_capped, p_commission_cap_frequency,
    p_commission_cap_amount_minor, now_ts
  );

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

-- ============================================================
-- 7. complete_profile_setup: use date for initial effective_from
-- ============================================================

DROP FUNCTION IF EXISTS public.complete_profile_setup(
  text, text, text, boolean, text, text, bigint, integer, boolean, text, bigint, boolean
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
  today_in_tz date := (now_ts AT TIME ZONE p_reporting_timezone)::date;
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

  SELECT compensation_version_id INTO active_version_id
  FROM public.artist_compensation_versions
  WHERE user_id = current_user_id AND effective_to IS NULL
  LIMIT 1;

  IF active_version_id IS NULL THEN
    INSERT INTO public.artist_compensation_versions (
      user_id, effective_from, effective_to,
      pay_chair_rent, rent_type, fixed_frequency, fixed_amount_minor,
      commission_rate_bps, commission_capped, commission_cap_frequency,
      commission_cap_amount_minor, updated_at
    )
    VALUES (
      current_user_id,
      today_in_tz - INTERVAL '6 months',  -- date 6 months ago; covers backdate window
      NULL,
      p_pay_chair_rent, p_rent_type, p_fixed_frequency, p_fixed_amount_minor,
      p_commission_rate_bps, p_commission_capped, p_commission_cap_frequency,
      p_commission_cap_amount_minor, now_ts
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
    user_id, display_name, default_currency, reporting_timezone,
    marketing_consent, is_profile_complete, profile_completed_at
  )
  VALUES (
    current_user_id, p_display_name, p_default_currency, p_reporting_timezone,
    p_marketing_consent, true, now_ts
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = excluded.display_name,
    default_currency = excluded.default_currency,
    reporting_timezone = excluded.reporting_timezone,
    marketing_consent = excluded.marketing_consent,
    is_profile_complete = true,
    profile_completed_at = excluded.profile_completed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_profile_setup(
  text, text, text, boolean, text, text, bigint, integer, boolean, text, bigint, boolean
) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_profile_setup(
  text, text, text, boolean, text, text, bigint, integer, boolean, text, bigint, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_profile_setup(
  text, text, text, boolean, text, text, bigint, integer, boolean, text, bigint, boolean
) TO service_role;

-- ============================================================
-- 8. compute_dashboard_take_home_summary: use date comparisons
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_dashboard_take_home_summary(
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
  net_minor bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
-- Copy the full body of the existing function from migration 20260417152000,
-- replacing ONLY these two things:
--   1. "timezone(p_reporting_timezone, s.session_at) as local_session_at"
--      → "s.session_at::timestamp as local_session_at"
--   2. "s.session_at >= p_month_start_utc AND s.session_at < p_month_end_utc"
--      → "s.session_at >= p_month_start_local_date AND s.session_at < p_month_end_local_date"
-- All other logic (commission bucketing, expense joins) stays identical.
-- Read 20260417152000_slice5_take_home_summary_rpc.sql for the full body.
$$;
```

> **Note on step 8:** The take_home_summary RPC body is long (~200 lines). Copy it verbatim from `supabase/migrations/20260417152000_slice5_take_home_summary_rpc.sql`, change only the two lines noted above, and paste it into the migration. Do not include the REVOKE/GRANT block again — it stays the same.

Similarly update `compute_client_retention` (in `20260417170000_slice5_client_retention_rpc.sql`) and `compute_avg_profit_per_session` (in `20260418130000_slice5_avg_profit_per_session.sql`) applying the same two substitutions.

- [ ] **Step 2: Update seed.sql — remove session_duration, convert timestamps to dates**

In `supabase/seed.sql`, find all `INSERT INTO public.sessions` blocks. Remove `session_duration` from the column list and its values. Convert all `session_at` values from ISO timestamp strings to `YYYY-MM-DD` date strings (keep the same calendar date in UTC since seeded users are in Europe/London which is UTC or UTC+1 — pick the calendar date as-is).

Example before:
```sql
INSERT INTO public.sessions (session_id, user_id, client_id, price, session_duration, session_at, compensation_version_id, through_ads)
VALUES
  ('...', '...', '...', 15000, 120, '2026-01-05T10:00:00+00:00', '...', false),
```

Example after:
```sql
INSERT INTO public.sessions (session_id, user_id, client_id, price, session_at, compensation_version_id, through_ads)
VALUES
  ('...', '...', '...', 15000, '2026-01-05', '...', false),
```

Also update `INSERT INTO public.artist_compensation_versions`: convert `effective_from` and `effective_to` from timestamps to date strings. Example:
```sql
-- before:
effective_from = '2025-10-09T10:00:00+00:00', effective_to = NULL

-- after:
effective_from = '2025-10-09', effective_to = NULL
```

- [ ] **Step 3: Apply migration and verify**

```bash
npm run supabase:db:reset
```

Expected: reset completes with no errors. If the exclusion constraint step fails with a duplicate violation, the data conversion produced same-day effective_from values for two versions — the UPDATE in step 1 handles this, but check the data manually if it fails.

- [ ] **Step 4: Commit**

```bash
git checkout -b feat/date-only-sessions
git add supabase/migrations/20260422100000_date_only_sessions.sql supabase/seed.sql
git commit -m "feat(db): convert session_at to date, drop session_duration, date-based compensation versions"
```

---

## Task 2: Wire Models and API Validation

**Files:**
- Modify: `lib/sessions/models/session-write-models.ts`
- Modify: `lib/sessions/session-write.ts`
- Modify: `lib/sessions/session-write.test.ts`
- Modify: `app/api/sessions/route.ts`
- Modify: `app/api/sessions/[sessionId]/route.ts`
- Modify: `app/api/profile/route.ts`

- [ ] **Step 1: Write failing tests for new session write models**

In `lib/sessions/session-write.test.ts`, replace all existing tests with:

```typescript
import { parseSessionCreatePayload, parseSessionUpdatePayload } from "./session-write";

describe("parseSessionCreatePayload", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });
  afterEach(() => { jest.useRealTimers(); });

  it("accepts valid existing-client payload", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "alice@example.com",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      throughAds: true,
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "alice@example.com",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      throughAds: true,
      inProgress: false,
    });
  });

  it("rejects future date", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-10",
    });
    expect(result.error).toBe("Session date cannot be in the future.");
  });

  it("rejects date more than 6 months in the past", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2025-10-08",
    });
    expect(result.error).toBe("Session date cannot be more than 6 months in the past.");
  });

  it("rejects malformed date string", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "not-a-date",
    });
    expect(result.error).toBe("Session date is invalid.");
  });

  it("rejects missing sessionDate", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
    });
    expect(result.error).toBe("Session date is invalid.");
  });
});

describe("parseSessionUpdatePayload", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });
  afterEach(() => { jest.useRealTimers(); });

  it("accepts valid update payload", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      inProgress: false,
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ priceMinor: 5000, sessionDate: "2026-04-09", inProgress: false });
  });

  it("rejects unexpected keys", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      inProgress: false,
      sessionDurationMinutes: 90,
    });
    expect(result.error).toBeTruthy();
  });

  it("rejects future date", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 5000,
      sessionDate: "2026-04-10",
      inProgress: false,
    });
    expect(result.error).toBe("Session date cannot be in the future.");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest session-write --no-coverage
```

Expected: all new tests fail because the implementation still uses `sessionDurationMinutes`/`sessionAtIso`.

- [ ] **Step 3: Update session write models**

Replace `lib/sessions/models/session-write-models.ts` with:

```typescript
export interface SessionCreatePayload {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDate: string;
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface SessionUpdatePayload {
  priceMinor: number;
  sessionDate: string;
  inProgress: boolean;
}

export interface SessionCreatePayloadCandidate {
  selectedClientId?: unknown;
  createNewClient?: unknown;
  clientName?: unknown;
  clientContact?: unknown;
  priceMinor?: unknown;
  sessionDate?: unknown;
  throughAds?: unknown;
  inProgress?: unknown;
}

export interface SessionUpdatePayloadCandidate {
  priceMinor?: unknown;
  sessionDate?: unknown;
  inProgress?: unknown;
  [key: string]: unknown;
}
```

- [ ] **Step 4: Update session-write.ts**

Replace `lib/sessions/session-write.ts` with:

```typescript
import type {
  SessionCreatePayload,
  SessionCreatePayloadCandidate,
  SessionUpdatePayload,
  SessionUpdatePayloadCandidate,
} from "@/lib/sessions/models";

export type { SessionCreatePayload, SessionUpdatePayload };

const SESSION_UPDATE_ALLOWED_KEYS = new Set(["priceMinor", "sessionDate", "inProgress"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSION_BACKDATE_MONTHS = 6;

function parseSessionDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return null;
  }
  const timestamp = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return value;
}

function isFutureDate(dateString: string): boolean {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const sessionTimestamp = Date.parse(dateString + "T00:00:00Z");
  return sessionTimestamp > todayUtc.getTime();
}

function isTooFarInPast(dateString: string): boolean {
  const limit = new Date();
  limit.setUTCHours(0, 0, 0, 0);
  limit.setUTCMonth(limit.getUTCMonth() - MAX_SESSION_BACKDATE_MONTHS);
  const sessionTimestamp = Date.parse(dateString + "T00:00:00Z");
  return sessionTimestamp < limit.getTime();
}

export function parseSessionCreatePayload(input: unknown): {
  data: SessionCreatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Session payload is invalid." };
  }

  const candidate = input as SessionCreatePayloadCandidate;
  const createNewClient = candidate.createNewClient;
  if (typeof createNewClient !== "boolean") {
    return { data: null, error: "Create client selection is invalid." };
  }

  const selectedClientId =
    typeof candidate.selectedClientId === "string" && candidate.selectedClientId.trim().length > 0
      ? candidate.selectedClientId.trim()
      : null;
  const clientName = typeof candidate.clientName === "string" ? candidate.clientName.trim() : "";
  const clientContact =
    typeof candidate.clientContact === "string" ? candidate.clientContact.trim() : "";

  if (!selectedClientId && !createNewClient) {
    return { data: null, error: "Select an existing client or create a new one before saving." };
  }
  if (createNewClient && clientName.length < 1) {
    return { data: null, error: "Client name is required for a new client." };
  }

  const priceMinor = candidate.priceMinor;
  if (typeof priceMinor !== "number" || !Number.isInteger(priceMinor) || priceMinor < 0) {
    return { data: null, error: "Price is invalid." };
  }

  const sessionDate = parseSessionDate(candidate.sessionDate);
  if (!sessionDate) {
    return { data: null, error: "Session date is invalid." };
  }
  if (isFutureDate(sessionDate)) {
    return { data: null, error: "Session date cannot be in the future." };
  }
  if (isTooFarInPast(sessionDate)) {
    return { data: null, error: "Session date cannot be more than 6 months in the past." };
  }

  const throughAds = candidate.throughAds;
  if (throughAds !== null && throughAds !== undefined && typeof throughAds !== "boolean") {
    return { data: null, error: "Advertising selection is invalid." };
  }
  const inProgress = candidate.inProgress;
  if (inProgress !== null && inProgress !== undefined && typeof inProgress !== "boolean") {
    return { data: null, error: "Follow-up status is invalid." };
  }

  return {
    data: {
      selectedClientId,
      createNewClient,
      clientName,
      clientContact,
      priceMinor,
      sessionDate,
      throughAds: throughAds ?? null,
      inProgress: inProgress === true,
    },
    error: null,
  };
}

export function parseSessionUpdatePayload(input: unknown): {
  data: SessionUpdatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Session update payload is invalid." };
  }

  const candidate = input as SessionUpdatePayloadCandidate;
  const hasUnexpectedKeys = Object.keys(candidate).some(
    (key) => !SESSION_UPDATE_ALLOWED_KEYS.has(key),
  );
  if (hasUnexpectedKeys) {
    return { data: null, error: "Only price, session date, and follow-up status can be updated." };
  }

  const priceMinor = candidate.priceMinor;
  if (typeof priceMinor !== "number" || !Number.isInteger(priceMinor) || priceMinor < 0) {
    return { data: null, error: "Price is invalid." };
  }

  const sessionDate = parseSessionDate(candidate.sessionDate);
  if (!sessionDate) {
    return { data: null, error: "Session date is invalid." };
  }
  if (isFutureDate(sessionDate)) {
    return { data: null, error: "Session date cannot be in the future." };
  }
  if (isTooFarInPast(sessionDate)) {
    return { data: null, error: "Session date cannot be more than 6 months in the past." };
  }

  const inProgress = candidate.inProgress;
  if (inProgress !== null && inProgress !== undefined && typeof inProgress !== "boolean") {
    return { data: null, error: "Follow-up status is invalid." };
  }

  return {
    data: { priceMinor, sessionDate, inProgress: inProgress === true },
    error: null,
  };
}
```

- [ ] **Step 5: Update the sessions create API route**

In `app/api/sessions/route.ts`, replace the RPC call block. Find where `p_session_duration_minutes` and `p_session_at` are used and update:

```typescript
// Replace the rpc call arguments:
const { data: rpcData, error: rpcError } = await supabase.rpc(
  "create_session_with_optional_client",
  {
    p_selected_client_id: payload.selectedClientId ?? null,
    p_create_new_client: payload.createNewClient,
    p_client_name: payload.clientName,
    p_client_contact: payload.clientContact,
    p_price_minor: payload.priceMinor,
    p_session_at: payload.sessionDate,       // renamed from sessionAtIso, now a date string
    p_through_ads: payload.throughAds ?? null,
    p_in_progress: payload.inProgress,
    // p_session_duration_minutes: REMOVED
  },
);
```

- [ ] **Step 6: Update the sessions update API route**

In `app/api/sessions/[sessionId]/route.ts`, update the RPC call:

```typescript
const { error: rpcError } = await supabase.rpc("update_owned_session", {
  p_session_id: sessionId,
  p_price_minor: payload.priceMinor,
  p_session_at: payload.sessionDate,       // renamed, now a date string
  p_in_progress: payload.inProgress,
  // p_session_duration_minutes: REMOVED
});
```

- [ ] **Step 7: Update the profile API route to return effectiveFrom**

In `app/api/profile/route.ts`, the `rollover_profile_compensation_version` RPC now returns a `date`. Update the success response:

```typescript
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

// newEffectiveFrom is a date string "YYYY-MM-DD"
return NextResponse.json({ success: true, effectiveFrom: newEffectiveFrom as string });
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
npx jest session-write --no-coverage
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/sessions/models/session-write-models.ts lib/sessions/session-write.ts lib/sessions/session-write.test.ts app/api/sessions/route.ts "app/api/sessions/[sessionId]/route.ts" app/api/profile/route.ts
git commit -m "feat(sessions): rename sessionAtIso→sessionDate, remove sessionDurationMinutes from wire models and API"
```

---

## Task 3: Session Fetch and List Utilities

**Files:**
- Modify: `lib/sessions/fetch-sessions-page.ts`
- Modify: `lib/sessions/fetch-sessions-page.test.ts`
- Modify: `lib/clients/fetch-clients-page.ts`
- Modify: `components/dashboard/sessions/utils/session-listing.ts`
- Modify: `components/dashboard/sessions/utils/session-formatting.ts`
- Modify: `components/dashboard/sessions/utils/session-formatting.test.ts`
- Modify: `components/dashboard/sessions/hooks/use-sessions-pagination.test.ts`

- [ ] **Step 1: Update session-listing.ts**

Replace `components/dashboard/sessions/utils/session-listing.ts` with:

```typescript
export type SessionSortField = "date" | "profit";
export type SessionSortDirection = "asc" | "desc";

export interface SessionListItem {
  id: string;
  clientName: string;
  priceMinor: number;
  sessionDate: string;   // "YYYY-MM-DD" calendar date of the session
  createdAt: string;     // server timestamp; used only as a tiebreaker for same-day sort
  throughAds: boolean;
  inProgress: boolean;
  isLatestForClient: boolean;
}

export interface SessionSortState {
  field: SessionSortField;
  direction: SessionSortDirection;
}

const DEFAULT_SORT_STATE: SessionSortState = { field: "date", direction: "desc" };

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterSessionsByClientName(
  sessions: SessionListItem[],
  query: string,
): SessionListItem[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return sessions;
  return sessions.filter((session) =>
    session.clientName.toLowerCase().includes(normalizedQuery),
  );
}

function normalizeSortState(sortState: Partial<SessionSortState> | undefined): SessionSortState {
  const field = sortState?.field;
  const direction = sortState?.direction;
  const normalizedField: SessionSortField = field === "date" || field === "profit" ? field : DEFAULT_SORT_STATE.field;
  const normalizedDirection: SessionSortDirection = direction === "asc" || direction === "desc" ? direction : DEFAULT_SORT_STATE.direction;
  return { field: normalizedField, direction: normalizedDirection };
}

function getSessionSortValue(session: SessionListItem, field: SessionSortField): number {
  if (field === "profit") return session.priceMinor;
  // Parse "YYYY-MM-DD" as UTC midnight for numeric comparison
  return Date.parse(session.sessionDate + "T00:00:00Z");
}

export function sortSessions(
  sessions: SessionListItem[],
  sortState?: Partial<SessionSortState>,
): SessionListItem[] {
  const normalizedSortState = normalizeSortState(sortState);
  const directionFactor = normalizedSortState.direction === "asc" ? 1 : -1;

  return sessions
    .map((session, index) => ({ session, index }))
    .sort((a, b) => {
      const valueA = getSessionSortValue(a.session, normalizedSortState.field);
      const valueB = getSessionSortValue(b.session, normalizedSortState.field);

      if (valueA !== valueB) {
        return (valueA - valueB) * directionFactor;
      }

      // Same-day tiebreaker: most recently logged first (created_at desc), always
      const createdA = Date.parse(a.session.createdAt);
      const createdB = Date.parse(b.session.createdAt);
      if (Number.isFinite(createdA) && Number.isFinite(createdB) && createdA !== createdB) {
        return createdB - createdA;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.session);
}

export function getVisibleSessions(
  sessions: SessionListItem[],
  query: string,
  sortState?: Partial<SessionSortState>,
): SessionListItem[] {
  const filtered = filterSessionsByClientName(sessions, query);
  return sortSessions(filtered, sortState);
}
```

- [ ] **Step 2: Update session-formatting.ts**

Replace `components/dashboard/sessions/utils/session-formatting.ts` with:

```typescript
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { SessionListItem } from "./session-listing";

const UNKNOWN_CLIENT_NAME = "Unknown client";

export interface SessionRow {
  session_id: string;
  client_id?: string | null;
  price: number | null;
  session_at: string | null;    // now a "YYYY-MM-DD" date string
  through_ads?: boolean | null;
  in_progress?: boolean | null;
  is_latest_for_client?: boolean | null;
  created_at?: string | null;
  compensation_version_id?: string | null;
  artist_compensation_versions?:
    | {
        compensation_version_id?: string | null;
        pay_chair_rent?: boolean | null;
        rent_type?: string | null;
        fixed_frequency?: string | null;
        fixed_amount_minor?: number | null;
        commission_rate_bps?: number | null;
        commission_capped?: boolean | null;
        commission_cap_frequency?: string | null;
        commission_cap_amount_minor?: number | null;
      }
    | Array<{
        compensation_version_id?: string | null;
        pay_chair_rent?: boolean | null;
        rent_type?: string | null;
        fixed_frequency?: string | null;
        fixed_amount_minor?: number | null;
        commission_rate_bps?: number | null;
        commission_capped?: boolean | null;
        commission_cap_frequency?: string | null;
        commission_cap_amount_minor?: number | null;
      }>
    | null;
  clients?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
}

function getClientName(clients: SessionRow["clients"]): string {
  if (Array.isArray(clients)) {
    const firstClientName = clients[0]?.name?.trim();
    return firstClientName || UNKNOWN_CLIENT_NAME;
  }
  const clientName = clients?.name?.trim();
  return clientName || UNKNOWN_CLIENT_NAME;
}

export function mapSessionRowsToListItems(rows: SessionRow[]): SessionListItem[] {
  return rows.map((row) => ({
    id: row.session_id,
    clientName: getClientName(row.clients),
    priceMinor: row.price ?? 0,
    sessionDate: row.session_at ?? "",
    createdAt: row.created_at ?? new Date(0).toISOString(),
    throughAds: row.through_ads === true,
    inProgress: row.in_progress === true,
    isLatestForClient: row.is_latest_for_client !== false,
  }));
}

export function formatSessionDate(sessionDate: string): string {
  const parts = sessionDate.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return "Unknown date";
  try {
    // Use local date constructor to avoid UTC-offset shift in display
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(year, month - 1, day),
    );
  } catch {
    return sessionDate;
  }
}

export function formatSessionProfit(
  priceMinor: number,
  currencyCode: string = DEFAULT_CURRENCY,
): string {
  const amount = Number.isFinite(priceMinor) ? priceMinor / 100 : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: DEFAULT_CURRENCY }).format(amount);
  }
}
```

- [ ] **Step 3: Update session-formatting.test.ts**

Find and remove all tests for `formatSessionDuration`. Update `mapSessionRowsToListItems` tests to use `sessionDate` instead of `durationMinutes`/`createdAt`. Update `formatSessionDate` tests to pass a `"YYYY-MM-DD"` string and verify the output is a formatted date string (not checking timezone since it's locale-dependent):

```typescript
describe("formatSessionDate", () => {
  it("formats a valid date string", () => {
    const result = formatSessionDate("2026-04-22");
    // Just verify it returns a non-empty string that isn't "Unknown date"
    expect(result).not.toBe("Unknown date");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns Unknown date for empty string", () => {
    expect(formatSessionDate("")).toBe("Unknown date");
  });

  it("returns Unknown date for malformed string", () => {
    expect(formatSessionDate("not-a-date")).toBe("Unknown date");
  });
});

describe("mapSessionRowsToListItems", () => {
  it("maps session_at date to sessionDate", () => {
    const rows: SessionRow[] = [{
      session_id: "s1",
      price: 5000,
      session_at: "2026-04-09",
      created_at: "2026-04-09T10:30:00Z",
      clients: { name: "Alice" },
    }];
    const result = mapSessionRowsToListItems(rows);
    expect(result[0]?.sessionDate).toBe("2026-04-09");
    expect(result[0]?.createdAt).toBe("2026-04-09T10:30:00Z");
  });
});
```

- [ ] **Step 4: Update fetch-sessions-page.ts**

Key changes:
1. Remove `duration` from `SORT_FIELD_TO_COLUMN`
2. Remove `session_duration` from the SELECT string
3. Add `created_at` to secondary ORDER BY
4. Fix date range filtering to use `getDateRangeStartDate` (returns "YYYY-MM-DD")
5. Fix `getSortValueForCursor` to remove duration case
6. Fix `annotateLatestForClient` to include `created_at` in select and secondary order

```typescript
import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionRow } from "@/components/dashboard/sessions/utils/session-formatting";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDateRangeStartDate } from "@/lib/timezones";
import type { FetchSessionsPageParams, FetchSessionsPageResult } from "@/lib/sessions/models";
import { encodeCompositeCursor } from "@/lib/pagination/cursor";

const SORT_FIELD_TO_COLUMN: Record<SessionSortField, string> = {
  date: "session_at",
  profit: "price",
};

function escapeLikePattern(query: string): string {
  return query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

async function hydrateMissingCompensationVersions({
  supabase,
  userId,
  rows,
}: {
  supabase: SupabaseClient;
  userId: string;
  rows: SessionRow[];
}): Promise<SessionRow[]> {
  type CompensationVersionRelation = Exclude<SessionRow["artist_compensation_versions"], null | undefined>;
  const rowsMissingCompensation = rows.filter(
    (row) =>
      row.compensation_version_id === null &&
      row.artist_compensation_versions === null &&
      typeof row.session_at === "string" &&
      row.session_at.length > 0,
  );

  if (rowsMissingCompensation.length === 0) return rows;

  const resolvedBySessionId = new Map<string, CompensationVersionRelation>();

  await Promise.all(
    rowsMissingCompensation.map(async (row) => {
      const { data: versionRows, error } = await supabase
        .from("artist_compensation_versions")
        .select(
          "compensation_version_id,pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor",
        )
        .eq("user_id", userId)
        .lte("effective_from", row.session_at)
        .or(`effective_to.is.null,effective_to.gt.${row.session_at}`)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (error || !versionRows?.[0]?.compensation_version_id) return;
      resolvedBySessionId.set(row.session_id, versionRows[0] as CompensationVersionRelation);
    }),
  );

  if (resolvedBySessionId.size === 0) return rows;

  return rows.map((row) => {
    const fallbackVersion = resolvedBySessionId.get(row.session_id);
    if (!fallbackVersion) return row;
    const fallbackSingleVersion = Array.isArray(fallbackVersion) ? fallbackVersion[0] ?? null : fallbackVersion;
    if (!fallbackSingleVersion?.compensation_version_id) return row;
    return { ...row, compensation_version_id: fallbackSingleVersion.compensation_version_id, artist_compensation_versions: fallbackSingleVersion };
  });
}

function formatOrValue(value: string | number): string {
  if (typeof value === "number") return String(value);
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function getSortValueForCursor(row: SessionRow, sortField: SessionSortField): string | number {
  if (sortField === "profit") return Number(row.price ?? 0);
  return row.session_at ?? "";
}

async function annotateLatestForClient({
  supabase,
  userId,
  rows,
}: {
  supabase: SupabaseClient;
  userId: string;
  rows: SessionRow[];
}): Promise<SessionRow[]> {
  const clientIds = [...new Set(rows.map((r) => r.client_id).filter((id): id is string => !!id))];
  if (clientIds.length === 0) return rows.map((r) => ({ ...r, is_latest_for_client: true }));

  const { data: latestData } = await supabase
    .from("sessions")
    .select("client_id,session_at,created_at")
    .eq("user_id", userId)
    .in("client_id", clientIds)
    .order("client_id")
    .order("session_at", { ascending: false })
    .order("created_at", { ascending: false });

  // Track the most recent session (by date then created_at) per client
  const latestByClient = new Map<string, { sessionAt: string; createdAt: string }>();
  for (const row of latestData ?? []) {
    if (row.client_id && !latestByClient.has(row.client_id)) {
      latestByClient.set(row.client_id, {
        sessionAt: row.session_at as string,
        createdAt: row.created_at as string,
      });
    }
  }

  return rows.map((row) => {
    const latest = latestByClient.get(row.client_id ?? "");
    return {
      ...row,
      is_latest_for_client:
        !row.client_id ||
        (row.session_at === latest?.sessionAt && row.created_at === latest?.createdAt),
    };
  });
}

export async function fetchSessionsPage({
  supabase,
  userId,
  reportingTimezone,
  searchQuery,
  sortField,
  cursor,
  limit,
  dateRange,
}: FetchSessionsPageParams): Promise<FetchSessionsPageResult> {
  const sortColumn = SORT_FIELD_TO_COLUMN[sortField];
  const normalizedQuery = searchQuery.trim();
  // Use date-based range start (YYYY-MM-DD) since session_at is now a date column
  const dateRangeStart = getDateRangeStartDate({ preset: dateRange, timezone: reportingTimezone });
  if (dateRange !== "allTime" && !dateRangeStart) {
    throw new Error("Could not compute date range boundaries.");
  }

  let rowsQuery = supabase
    .from("sessions")
    .select(
      "session_id,client_id,price,session_at,through_ads,in_progress,created_at,compensation_version_id,clients!inner(name),artist_compensation_versions!sessions_compensation_version_id_fkey(compensation_version_id,pay_chair_rent,rent_type,fixed_frequency,fixed_amount_minor,commission_rate_bps,commission_capped,commission_cap_frequency,commission_cap_amount_minor)",
    )
    .eq("user_id", userId)
    .order(sortColumn, { ascending: false })
    .order("created_at", { ascending: false })  // tiebreaker: most recently logged first
    .order("session_id", { ascending: false })   // final deterministic tiebreaker
    .limit(limit + 1);

  if (dateRangeStart) {
    rowsQuery = rowsQuery.gte("session_at", dateRangeStart);
  }

  if (normalizedQuery.length > 0) {
    const escapedQuery = `%${escapeLikePattern(normalizedQuery)}%`;
    rowsQuery = rowsQuery.ilike("clients.name", escapedQuery);
  }

  if (cursor) {
    const cursorSortValue = formatOrValue(cursor.sortValue);
    const cursorId = formatOrValue(cursor.id);
    rowsQuery = rowsQuery.or(
      `${sortColumn}.lt.${cursorSortValue},and(${sortColumn}.eq.${cursorSortValue},session_id.lt.${cursorId})`,
    );
  }

  const { data, error } = await rowsQuery;
  if (error) throw new Error(error.message ?? "Could not load sessions.");

  const rows = (data ?? []) as SessionRow[];
  const hasNextPage = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const hydratedRows = await hydrateMissingCompensationVersions({ supabase, userId, rows: pageRows });
  const annotatedRows = await annotateLatestForClient({ supabase, userId, rows: hydratedRows });

  const lastRow = pageRows[pageRows.length - 1] ?? null;
  const nextCursor =
    hasNextPage && lastRow
      ? encodeCompositeCursor({ sortValue: getSortValueForCursor(lastRow, sortField), id: lastRow.session_id })
      : null;

  return { data: annotatedRows, hasNextPage, nextCursor };
}
```

- [ ] **Step 5: Update fetch-clients-page.ts**

In `lib/clients/fetch-clients-page.ts`, the `last_session_at` row type changes from `string | null` (ISO timestamp) to `string | null` (date string). The existing mapping `lastSessionAt: row.last_session_at ?? null` stays the same — just update the comment/type if present.

- [ ] **Step 6: Update fetch-sessions-page.test.ts and use-sessions-pagination.test.ts**

In `lib/sessions/fetch-sessions-page.test.ts`: replace any `durationMinutes` references with `sessionDate`. Replace `createdAt` references that were pointing to `session_at` timestamps with `sessionDate` date strings.

In `components/dashboard/sessions/hooks/use-sessions-pagination.test.ts`: update mock session data to use `sessionDate` instead of `durationMinutes`, remove any `createdAt` references that used `session_at` timestamps.

- [ ] **Step 7: Run tests**

```bash
npx jest fetch-sessions-page use-sessions-pagination session-formatting session-listing --no-coverage
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/sessions/fetch-sessions-page.ts lib/sessions/fetch-sessions-page.test.ts lib/clients/fetch-clients-page.ts "components/dashboard/sessions/utils/session-listing.ts" "components/dashboard/sessions/utils/session-formatting.ts" "components/dashboard/sessions/utils/session-formatting.test.ts" "components/dashboard/sessions/hooks/use-sessions-pagination.test.ts"
git commit -m "feat(sessions): remove duration from session listing, date-only session_at in fetch logic"
```

---

## Task 4: Session Form Components

**Files:**
- Modify: `components/dashboard/session-form/session-editable-fields.tsx`
- Modify: `components/dashboard/session-form/utils/session-form-validation.ts`
- Modify: `components/dashboard/session-form/utils/session-form-validation.test.ts`
- Modify: `components/dashboard/session-form/models/session-form-data-models.ts`
- Modify: `components/dashboard/session-form/hooks/use-session-form-data.ts`
- Modify: `components/dashboard/session-form/add-session-modal.tsx`
- Modify: `components/dashboard/sessions/session-edit-modal.tsx`

- [ ] **Step 1: Write failing validation tests**

In `components/dashboard/session-form/utils/session-form-validation.test.ts`, add/replace with tests for the new date-only validation:

```typescript
import { validateEditableSessionFields, validateSessionForm } from "./session-form-validation";
import type { EditableSessionFieldsInput, SessionFormValidationInput } from "./session-form-validation";

const BASE_EDITABLE: EditableSessionFieldsInput = {
  profit: "100.00",
  sessionDate: "2026-04-09",
  reportingTimezone: "Europe/London",
};

describe("validateEditableSessionFields", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });
  afterEach(() => { jest.useRealTimers(); });

  it("accepts valid date and price", () => {
    const result = validateEditableSessionFields(BASE_EDITABLE);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.sessionDate).toBe("2026-04-09");
      expect(result.priceMinor).toBe(10000);
    }
  });

  it("rejects future date", () => {
    const result = validateEditableSessionFields({ ...BASE_EDITABLE, sessionDate: "2026-04-10" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toMatch(/future/i);
  });

  it("rejects date more than 6 months in the past", () => {
    const result = validateEditableSessionFields({ ...BASE_EDITABLE, sessionDate: "2025-10-08" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toMatch(/6 months/i);
  });

  it("rejects empty date", () => {
    const result = validateEditableSessionFields({ ...BASE_EDITABLE, sessionDate: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid price", () => {
    const result = validateEditableSessionFields({ ...BASE_EDITABLE, profit: "abc" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toMatch(/price/i);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest session-form-validation --no-coverage
```

Expected: tests fail because the current validation still expects `hours`/`minutes` fields.

- [ ] **Step 3: Update session-form-validation.ts**

Replace `components/dashboard/session-form/utils/session-form-validation.ts` with:

```typescript
import { toMinorUnits } from "@/lib/currency";
import { isSupportedTimezone } from "@/lib/timezones";
import {
  isDuplicateClientName,
  normalizeClientName,
} from "@/components/dashboard/session-form/utils/client-selection";
import type {
  EditableSessionFieldsInput,
  SessionFormValidationInput,
} from "@/components/dashboard/session-form/models";
export type { EditableSessionFieldsInput, SessionFormValidationInput };

type EditableSessionFieldsResult =
  | { valid: true; sessionDate: string; priceMinor: number }
  | { valid: false; errorMessage: string };

type SessionFormValidationResult =
  | { valid: true; normalizedClientName: string; sessionDate: string; priceMinor: number }
  | { valid: false; errorMessage: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSION_BACKDATE_MONTHS = 6;

function isFutureDateInTimezone(dateString: string, reportingTimezone: string): boolean {
  const { DateTime } = require("luxon") as typeof import("luxon");
  const todayInTz = DateTime.now().setZone(reportingTimezone).startOf("day");
  const sessionDay = DateTime.fromISO(dateString, { zone: reportingTimezone }).startOf("day");
  return sessionDay > todayInTz;
}

function isTooFarInPastInTimezone(dateString: string, reportingTimezone: string): boolean {
  const { DateTime } = require("luxon") as typeof import("luxon");
  const todayInTz = DateTime.now().setZone(reportingTimezone).startOf("day");
  const limitInTz = todayInTz.minus({ months: MAX_SESSION_BACKDATE_MONTHS });
  const sessionDay = DateTime.fromISO(dateString, { zone: reportingTimezone }).startOf("day");
  return sessionDay < limitInTz;
}

export function validateEditableSessionFields(
  input: EditableSessionFieldsInput,
): EditableSessionFieldsResult {
  const sessionDate = input.sessionDate.trim();

  if (!sessionDate || !DATE_PATTERN.test(sessionDate)) {
    return { valid: false, errorMessage: "Session date is required." };
  }

  if (!isSupportedTimezone(input.reportingTimezone)) {
    return { valid: false, errorMessage: "Reporting timezone is invalid." };
  }

  if (isFutureDateInTimezone(sessionDate, input.reportingTimezone)) {
    return { valid: false, errorMessage: "Session date cannot be in the future." };
  }

  if (isTooFarInPastInTimezone(sessionDate, input.reportingTimezone)) {
    return { valid: false, errorMessage: "Session date cannot be more than 6 months in the past." };
  }

  try {
    const priceMinor = toMinorUnits(input.profit);
    return { valid: true, sessionDate, priceMinor };
  } catch {
    return { valid: false, errorMessage: "Price must be a valid number." };
  }
}

export function validateSessionForm(
  input: SessionFormValidationInput,
): SessionFormValidationResult {
  const normalizedClientName = normalizeClientName(input.clientName);

  if (!input.selectedClientId && !input.createNewClient) {
    return { valid: false, errorMessage: "Select an existing client or create a new one before saving." };
  }
  if (input.createNewClient && !normalizedClientName) {
    return { valid: false, errorMessage: "Client name is required for a new client." };
  }
  if (input.createNewClient && isDuplicateClientName(input.clients, normalizedClientName)) {
    return { valid: false, errorMessage: "A client with this name already exists. Choose it from Existing client." };
  }

  const editableFieldsValidation = validateEditableSessionFields({
    profit: input.profit,
    sessionDate: input.sessionDate,
    reportingTimezone: input.reportingTimezone,
  });

  if (!editableFieldsValidation.valid) return editableFieldsValidation;

  return {
    valid: true,
    normalizedClientName,
    sessionDate: editableFieldsValidation.sessionDate,
    priceMinor: editableFieldsValidation.priceMinor,
  };
}
```

- [ ] **Step 4: Update the form models**

In `components/dashboard/session-form/models/session-form-data-models.ts`:

```typescript
export interface SaveSessionParams {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDate: string;      // "YYYY-MM-DD"
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface SaveSessionResult {
  success: boolean;
  message?: string;
}

export interface SaveSessionApiResponse {
  error?: string;
  client?: { client_id: string; name: string } | null;
}
```

Also update the form input types in `components/dashboard/session-form/models/` (check for `EditableSessionFieldsInput` and `SessionFormValidationInput` — they may be defined inline or in a separate file). Update them to remove `hours`, `minutes`, and `sessionAtLocal`, and add `sessionDate`:

```typescript
export interface EditableSessionFieldsInput {
  profit: string;
  sessionDate: string;      // "YYYY-MM-DD"
  reportingTimezone: string;
}

export interface SessionFormValidationInput {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  profit: string;
  sessionDate: string;      // "YYYY-MM-DD"
  reportingTimezone: string;
  clients: ClientOption[];
}
```

- [ ] **Step 5: Update use-session-form-data.ts hook**

Remove `sessionDurationMinutes` from the `saveSession` callback. Rename `sessionAtIso` → `sessionDate`:

```typescript
const saveSession = useCallback(
  async ({
    selectedClientId,
    createNewClient,
    clientName,
    clientContact,
    priceMinor,
    sessionDate,
    throughAds,
    inProgress,
  }: SaveSessionParams): Promise<SaveSessionResult> => {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedClientId,
        createNewClient,
        clientName,
        clientContact,
        priceMinor,
        sessionDate,
        throughAds,
        inProgress,
      }),
    });
    const responseBody = (await response.json()) as SaveSessionApiResponse;
    if (!response.ok) {
      return { success: false, message: responseBody.error ?? "Could not save session." };
    }
    const createdClient = responseBody.client;
    if (createdClient?.client_id && createdClient.name) {
      setClients((prevClients) => {
        const exists = prevClients.some((client) => client.client_id === createdClient.client_id);
        if (exists) return prevClients;
        return [...prevClients, createdClient].sort((a, b) => a.name.localeCompare(b.name));
      });
    }
    return { success: true };
  },
  [],
);
```

- [ ] **Step 6: Update session-editable-fields.tsx to use Calendar + Popover**

Verify shadcn Calendar and Popover components exist:

```bash
ls /Users/kianacox/Code/ink_metrics/components/ui/ | grep -i "calendar\|popover"
```

If missing, install them:
```bash
npx shadcn@latest add calendar popover
```

Replace `components/dashboard/session-form/session-editable-fields.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { Input, Label, Button } from "@/components/ui";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

interface SessionEditableFieldsProps {
  fieldIdPrefix: string;
  sessionDate: string;          // "YYYY-MM-DD"
  profit: string;
  currencyCode: string;
  inProgress: boolean;
  onSessionDateChange: (value: string) => void;
  onProfitChange: (value: string) => void;
  onInProgressChange: (value: boolean) => void;
}

function getCurrencySymbol(currencyCode: string): string {
  try {
    const currencyPart = new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode })
      .formatToParts(0)
      .find((part) => part.type === "currency");
    return currencyPart?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

function formatDisplayDate(dateString: string): string {
  const parts = dateString.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return "Pick a date";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(year, month - 1, day),
    );
  } catch {
    return dateString;
  }
}

function parseDateString(dateString: string): Date | undefined {
  const parts = dateString.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function SessionEditableFields({
  fieldIdPrefix,
  sessionDate,
  profit,
  currencyCode,
  inProgress,
  onSessionDateChange,
  onProfitChange,
  onInProgressChange,
}: SessionEditableFieldsProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const priceId = `${fieldIdPrefix}-session-price`;
  const inProgressId = `${fieldIdPrefix}-in-progress`;
  const currencySymbol = getCurrencySymbol(currencyCode);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const selectedDate = parseDateString(sessionDate);

  function handleCalendarSelect(date: Date | undefined) {
    if (!date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onSessionDateChange(`${year}-${month}-${day}`);
    setCalendarOpen(false);
  }

  return (
    <>
      <div className="grid min-w-0 gap-2">
        <Label>Session date</Label>
        <p className="text-xs text-muted-foreground">
          You can backdate sessions by up to 6 months.
        </p>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
              {sessionDate ? formatDisplayDate(sessionDate) : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              disabled={(date) => date > today || date < sixMonthsAgo}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor={priceId}>Price</Label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            aria-hidden
          >
            {currencySymbol}
          </span>
          <Input
            id={priceId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={profit}
            onChange={(event) => onProfitChange(event.target.value)}
            className="pl-8"
            required
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border px-3 py-2">
        <input
          id={inProgressId}
          type="checkbox"
          checked={inProgress}
          onChange={(event) => onInProgressChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border border-input"
        />
        <div className="grid gap-0.5">
          <Label htmlFor={inProgressId} className="cursor-pointer leading-5">
            Follow-up session needed
          </Label>
          <p className="text-xs text-muted-foreground">
            For multi-session pieces billed per session — not touch-ups.
          </p>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 7: Update add-session-modal.tsx**

Key changes:
1. Remove `hours`, `minutes` state and their setters
2. Rename `sessionDateTime` state → `sessionDate` (string "YYYY-MM-DD")
3. Initialize `sessionDate` using luxon to get today in `reportingTimezone`
4. Remove the `Info` banner (backdate info moved to `SessionEditableFields`)
5. Remove `hours`/`minutes` from `validateSessionForm` call
6. Remove `sessionDurationMinutes` from `saveSession` call
7. Update `SessionEditableFields` props

```typescript
// In add-session-modal.tsx, replace the state declarations:
const [sessionDate, setSessionDate] = useState("");
// ... (keep all other state as-is)

// Replace the useEffect that initializes sessionDateTime:
useEffect(() => {
  if (!open) return;
  const { DateTime } = require("luxon") as typeof import("luxon");
  setSessionDate(DateTime.now().setZone(reportingTimezone).toFormat("yyyy-LL-dd"));
}, [open, reportingTimezone]);

// Replace resetForm to clear sessionDate:
const resetForm = useCallback((preserveStatus = false) => {
  setClientQuery("");
  setSelectedClientId(null);
  setNewClientContact("");
  setCreateNewClient(false);
  setProfit("");
  setThroughAds(false);
  setInProgress(false);
  const { DateTime } = require("luxon") as typeof import("luxon");
  setSessionDate(DateTime.now().setZone(reportingTimezone).toFormat("yyyy-LL-dd"));
  if (!preserveStatus) setStatus(null);
}, [reportingTimezone]);

// Replace validateSessionForm call in handleSubmit:
const validationResult = validateSessionForm({
  selectedClientId: clientId,
  createNewClient,
  clientName: normalizedClientName,
  profit,
  sessionDate,
  reportingTimezone,
  clients,
});

// Replace saveSession call:
const result = await saveSession({
  selectedClientId: clientId,
  createNewClient,
  clientName: validationResult.normalizedClientName,
  clientContact: normalizedNewClientContact,
  priceMinor: validationResult.priceMinor,
  sessionDate: validationResult.sessionDate,
  throughAds: displayAdvertCheckbox && createNewClient ? throughAds : null,
  inProgress,
});

// Replace SessionEditableFields usage:
<SessionEditableFields
  fieldIdPrefix="create"
  sessionDate={sessionDate}
  profit={profit}
  currencyCode={defaultCurrency}
  inProgress={inProgress}
  onSessionDateChange={setSessionDate}
  onProfitChange={setProfit}
  onInProgressChange={setInProgress}
/>
```

Also remove the `<Info>` banner JSX that says "You can backdate sessions by up to 6 months." — it now lives inside `SessionEditableFields`.

- [ ] **Step 8: Update session-edit-modal.tsx**

Key changes:
1. Remove `hours`, `minutes` state and `toHoursAndMinutes` helper
2. Add `sessionDate` state
3. Initialize from `session.sessionDate` instead of computing from `durationMinutes`
4. Remove duration fields from validation call
5. Update fetch body to use `sessionDate` instead of `sessionDurationMinutes`/`sessionAtIso`
6. Update `SessionEditableFields` props

```typescript
// Remove: toHoursAndMinutes function entirely
// Remove: const [hours, setHours] = useState("");
// Remove: const [minutes, setMinutes] = useState("");
// Remove: const [sessionDateTime, setSessionDateTime] = useState("");

// Add:
const [sessionDate, setSessionDate] = useState("");

// Replace the useEffect that initializes state:
useEffect(() => {
  if (!open || !session) return;
  setSessionDate(session.sessionDate);
  setProfit(toProfitValue(session.priceMinor));
  setInProgress(session.inProgress);
  setError(null);
}, [open, session]);

// Replace validateEditableSessionFields call:
const validationResult = validateEditableSessionFields({
  profit,
  sessionDate,
  reportingTimezone,
});

// Replace fetch body:
body: JSON.stringify({
  priceMinor: validationResult.priceMinor,
  sessionDate: validationResult.sessionDate,
  inProgress,
}),

// Replace SessionEditableFields usage:
<SessionEditableFields
  fieldIdPrefix="edit"
  sessionDate={sessionDate}
  profit={profit}
  currencyCode={currencyCode}
  inProgress={inProgress}
  onSessionDateChange={setSessionDate}
  onProfitChange={setProfit}
  onInProgressChange={setInProgress}
/>
```

- [ ] **Step 9: Run tests**

```bash
npx jest session-form-validation --no-coverage
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add "components/dashboard/session-form/session-editable-fields.tsx" "components/dashboard/session-form/utils/session-form-validation.ts" "components/dashboard/session-form/utils/session-form-validation.test.ts" "components/dashboard/session-form/models/session-form-data-models.ts" "components/dashboard/session-form/hooks/use-session-form-data.ts" "components/dashboard/session-form/add-session-modal.tsx" "components/dashboard/sessions/session-edit-modal.tsx"
git commit -m "feat(session-form): replace datetime+duration inputs with date picker, remove session duration"
```

---

## Task 5: Session List UI

**Files:**
- Modify: `components/dashboard/sessions/sessions-table.tsx`
- Modify: `components/dashboard/sessions/sessions-cards.tsx`
- Modify: `components/dashboard/sessions/sessions-view.tsx`

- [ ] **Step 1: Remove duration column from sessions-table.tsx**

In `sessions-table.tsx`:
1. Remove `formatSessionDuration` from imports
2. Remove the `<th>Session length</th>` header cell
3. Remove the `<td>{formatSessionDuration(session.durationMinutes)}</td>` data cell
4. Update `formatSessionDate` call: change `formatSessionDate(session.createdAt, reportingTimezone)` → `formatSessionDate(session.sessionDate)` (no timezone param needed)
5. Remove `reportingTimezone` from props if it is only used for `formatSessionDate`

- [ ] **Step 2: Remove duration display from sessions-cards.tsx**

In `sessions-cards.tsx`:
1. Remove `formatSessionDuration` from imports
2. Remove the "Length" `<div>` block:
   ```tsx
   // Remove this entire block:
   <div>
     <p className="text-xs text-muted-foreground">Length</p>
     <p className="text-sm font-medium text-foreground">
       {formatSessionDuration(session.durationMinutes)}
     </p>
   </div>
   ```
3. Update `formatSessionDate` call: `formatSessionDate(session.sessionDate)` (no timezone param)
4. The `grid-cols-2` on `CardContent` can become `grid-cols-1` since there's now only one stat (Profit) unless you want to add something else — leave it as `grid-cols-1` for now.

- [ ] **Step 3: Remove Duration sort option from sessions-view.tsx**

In `sessions-view.tsx`:
1. Remove `{ label: "Duration", value: "duration" }` from `SORT_FIELDS`
2. Update the description paragraph:
   ```tsx
   // Replace:
   <p className="mt-1 text-sm text-muted-foreground">
     Search by client and sort by date, session length, or session profit (descending).
   </p>
   // With:
   <p className="mt-1 text-sm text-muted-foreground">
     Search by client and sort by date or session profit (descending).
   </p>
   ```
3. No other changes needed — `DEFAULT_SORT_FIELD` is already `"date"` which is still valid.

- [ ] **Step 4: Run lint on touched files**

```bash
npm run lint -- --file components/dashboard/sessions/sessions-table.tsx --file components/dashboard/sessions/sessions-cards.tsx --file components/dashboard/sessions/sessions-view.tsx
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "components/dashboard/sessions/sessions-table.tsx" "components/dashboard/sessions/sessions-cards.tsx" "components/dashboard/sessions/sessions-view.tsx"
git commit -m "feat(session-list): remove duration column and sort option"
```

---

## Task 6: Compensation Settings UI

**Files:**
- Modify: `components/dashboard/profile/profile-edit-form.tsx`

- [ ] **Step 1: Update profile-edit-form.tsx**

The profile edit form currently shows a generic "Profile updated successfully." message on save. We need to:
1. Add an inline hint before the save button explaining the deferred effective date.
2. Update the success message to include the specific date new compensation settings apply.

The API now returns `{ success: true, effectiveFrom: "YYYY-MM-DD" }`. The form's save function needs to receive and display this date.

Find the function that calls the profile API (it calls `fetch("/api/profile", { method: "PUT", ... })`). Update the response handling:

```typescript
// After the existing fetch call, replace the success handling:
interface ProfileApiResponse {
  success?: boolean;
  error?: string;
  code?: string;
  effectiveFrom?: string;  // "YYYY-MM-DD" — when new compensation settings take effect
}

// In the submit handler, where the API call is made:
const responseBody = (await response.json()) as ProfileApiResponse;
if (!response.ok) {
  setStatus({ type: "error", message: responseBody.error ?? "Could not save profile changes." });
  return;
}

const effectiveFrom = responseBody.effectiveFrom;
const effectiveFromFormatted = effectiveFrom
  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(effectiveFrom + "T00:00:00"),
    )
  : null;

setStatus({
  type: "success",
  message: effectiveFromFormatted
    ? `Settings saved. Compensation changes apply from ${effectiveFromFormatted}.`
    : "Profile updated successfully.",
});
```

2. Add the inline hint. Find the save button section and add the hint above it:

```tsx
<div className="grid gap-2">
  <div className="min-h-4">
    {status ? (
      <p
        className={cn(
          "text-sm",
          status.type === "success" ? "text-primary" : "text-destructive",
        )}
        role="status"
      >
        {status.message}
      </p>
    ) : null}
  </div>
  {/* Add this hint above the save button: */}
  <p className="text-xs text-muted-foreground">
    Compensation changes take effect from tomorrow and do not affect past sessions.
  </p>
  <div className="flex justify-end">
    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : "Save changes"}
    </Button>
  </div>
</div>
```

- [ ] **Step 2: Lint the file**

```bash
npm run lint -- --file components/dashboard/profile/profile-edit-form.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "components/dashboard/profile/profile-edit-form.tsx"
git commit -m "feat(profile): add compensation change hint and show effective date on save"
```

---

## Task 7: Full Test Suite and E2E Verification

**Files:** Playwright tests, any remaining unit tests

- [ ] **Step 1: Run all unit tests**

```bash
npm test
```

Expected: all tests pass. Fix any remaining type errors or assertion failures caused by renamed fields (`sessionDate`, removed `durationMinutes`, etc.).

- [ ] **Step 2: Start dev server and run E2E tests**

```bash
npm run test:e2e
```

Expected: all tests pass. The global setup resets the DB before the run, which applies the new migration and seed. If e2e tests assert on:
- Session form fields: update assertions that look for hours/minutes inputs — they no longer exist. Look for the date picker button instead.
- Session table columns: update assertions that check for "Session length" column header — it no longer exists.
- Session duration values: remove assertions on duration display.

- [ ] **Step 3: Fix any failing e2e tests**

Common patterns to find and update in `tests/`:

```typescript
// Remove assertions like:
await expect(page.getByLabel("Hours")).toBeVisible();
await expect(page.getByLabel("Minutes")).toBeVisible();

// Replace with:
await expect(page.getByRole("button", { name: /pick a date|apr|2026/i })).toBeVisible();

// Remove assertions on duration column:
await expect(page.getByRole("columnheader", { name: "Session length" })).toBeVisible();

// Remove assertions on duration values like:
await expect(page.getByText("1h 30m")).toBeVisible();
```

- [ ] **Step 4: Run lint across all changed files**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Final commit**

```bash
git add -p  # stage any remaining test fixes
git commit -m "fix(tests): update e2e and unit tests for date-only session logging"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Remove time from session logging → `session_at` converted to `date`, `datetime-local` replaced with Calendar picker
- [x] Remove session duration/hours → `session_duration` dropped, duration column removed from table/cards, sort option removed
- [x] Compensation settings apply next calendar day → `rollover_profile_compensation_version` uses `tomorrow_in_tz`
- [x] First-time setup applies immediately → `complete_profile_setup` uses `today_in_tz - 6 months` for `effective_from`
- [x] UI copy updated → inline hint + effective-date toast on profile save; backdate note moved into date picker
- [x] DB migration → single migration file covering all changes
- [x] Timezone awareness → all date logic uses user's `reporting_timezone`; calendar disabled dates use browser time (server validates precisely)
- [x] Same-day session ordering → `created_at` secondary sort in fetch and annotation queries
- [x] `sessionDate: "YYYY-MM-DD"` wire format throughout

**Placeholder scan:** No TBDs. Task 1 step 8 notes that the take_home_summary RPC body must be copied from the existing migration — the implementor must read that file and paste it with two targeted substitutions. This is explicit, not vague.

**Type consistency:** `sessionDate` used consistently in models, validation, API routes, hooks, and modals. `durationMinutes` removed everywhere. `formatSessionDate(sessionDate: string)` no longer accepts a timezone param — callers in table and cards must drop that second argument.
