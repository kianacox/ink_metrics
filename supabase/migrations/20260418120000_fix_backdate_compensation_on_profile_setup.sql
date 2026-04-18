-- Backfill: fix compensation versions where effective_from was set to profile
-- completion time instead of 6 months prior. Only targets records where
-- effective_from is within one minute of profile_completed_at (the window
-- produced by the buggy function introduced in 20260414160000).
update public.artist_compensation_versions acv
set
  effective_from = p.profile_completed_at - interval '6 months',
  updated_at = now()
from public.profiles p
where acv.user_id = p.user_id
  and p.is_profile_complete = true
  and p.profile_completed_at is not null
  and acv.effective_to is null
  and acv.effective_from >= p.profile_completed_at - interval '1 minute'
  and acv.effective_from <= p.profile_completed_at + interval '1 minute';

-- Fix complete_profile_setup: restore the 6-month backdate for the initial
-- compensation version that was accidentally dropped in 20260414160000.

drop function if exists public.complete_profile_setup(
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

create or replace function public.complete_profile_setup(
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
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  now_ts timestamp with time zone := now();
  existing_profile_is_complete boolean := false;
  active_version_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to set up your profile.';
  end if;

  select is_profile_complete
  into existing_profile_is_complete
  from public.profiles
  where user_id = current_user_id
  limit 1;

  if coalesce(existing_profile_is_complete, false) then
    raise exception 'Profile setup has already been completed.';
  end if;

  select compensation_version_id
  into active_version_id
  from public.artist_compensation_versions
  where user_id = current_user_id
    and effective_to is null
  limit 1;

  if active_version_id is null then
    insert into public.artist_compensation_versions (
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
    values (
      current_user_id,
      now_ts - interval '6 months',
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
  else
    update public.artist_compensation_versions
    set
      pay_chair_rent = p_pay_chair_rent,
      rent_type = p_rent_type,
      fixed_frequency = p_fixed_frequency,
      fixed_amount_minor = p_fixed_amount_minor,
      commission_rate_bps = p_commission_rate_bps,
      commission_capped = p_commission_capped,
      commission_cap_frequency = p_commission_cap_frequency,
      commission_cap_amount_minor = p_commission_cap_amount_minor,
      updated_at = now_ts
    where compensation_version_id = active_version_id;
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    default_currency,
    reporting_timezone,
    marketing_consent,
    is_profile_complete,
    profile_completed_at
  )
  values (
    current_user_id,
    p_display_name,
    p_default_currency,
    p_reporting_timezone,
    p_marketing_consent,
    true,
    now_ts
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    default_currency = excluded.default_currency,
    reporting_timezone = excluded.reporting_timezone,
    marketing_consent = excluded.marketing_consent,
    is_profile_complete = true,
    profile_completed_at = excluded.profile_completed_at;
end;
$$;

revoke all on function public.complete_profile_setup(
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
) from public;

grant execute on function public.complete_profile_setup(
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
) to authenticated;

grant execute on function public.complete_profile_setup(
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
) to service_role;
