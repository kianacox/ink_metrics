revoke all on table public.artist_compensation_versions from authenticated;
grant select, insert, update on table public.artist_compensation_versions to authenticated;

create or replace function public.rollover_profile_compensation_version(
  p_effective_from timestamp with time zone,
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
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  now_ts timestamp with time zone := now();
  active_version_id uuid;
  active_effective_from timestamp with time zone;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to edit your profile.';
  end if;

  if p_effective_from > now_ts then
    raise exception 'Effective from timestamp cannot be in the future.';
  end if;

  select compensation_version_id, effective_from
  into active_version_id, active_effective_from
  from public.artist_compensation_versions
  where user_id = current_user_id
    and effective_to is null
    and effective_from <= now_ts
  order by effective_from desc
  limit 1;

  if active_version_id is null then
    raise exception 'Active compensation settings are missing.';
  end if;

  if p_effective_from <= active_effective_from then
    raise exception 'Effective from timestamp must be after the current active version start.';
  end if;

  update public.artist_compensation_versions
  set
    effective_to = p_effective_from,
    updated_at = now_ts
  where compensation_version_id = active_version_id;

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
    p_effective_from,
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

  update public.profiles
  set
    display_name = p_display_name,
    reporting_timezone = p_reporting_timezone
  where user_id = current_user_id;

  if not found then
    raise exception 'Profile row is missing.';
  end if;
end;
$$;

revoke all on function public.rollover_profile_compensation_version(
  timestamp with time zone,
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
) from public;

grant execute on function public.rollover_profile_compensation_version(
  timestamp with time zone,
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
) to authenticated;

grant execute on function public.rollover_profile_compensation_version(
  timestamp with time zone,
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
) to service_role;
