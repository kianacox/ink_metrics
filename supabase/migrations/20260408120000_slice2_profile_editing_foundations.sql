create extension if not exists btree_gist with schema extensions;

alter table public.profiles
add column if not exists reporting_timezone text;

update public.profiles
set reporting_timezone = 'Europe/London'
where reporting_timezone is null;

alter table public.profiles
alter column reporting_timezone set default 'Europe/London';

alter table public.profiles
alter column reporting_timezone set not null;

alter table public.profiles
add column if not exists week_starts_on smallint;

update public.profiles
set week_starts_on = 1
where week_starts_on is null;

alter table public.profiles
alter column week_starts_on set default 1;

alter table public.profiles
alter column week_starts_on set not null;

alter table public.profiles
drop constraint if exists profiles_week_starts_on_check;

alter table public.profiles
add constraint profiles_week_starts_on_check
check (week_starts_on >= 0 and week_starts_on <= 6);

create table if not exists public.artist_compensation_versions (
  compensation_version_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_from timestamp with time zone not null,
  effective_to timestamp with time zone,
  pay_chair_rent boolean not null,
  rent_type text,
  fixed_frequency text,
  fixed_amount_minor bigint,
  commission_rate_bps integer,
  commission_capped boolean,
  commission_cap_frequency text,
  commission_cap_amount_minor bigint,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint artist_compensation_versions_rent_type_check check (
    rent_type is null or rent_type in ('fixed', 'commission')
  ),
  constraint artist_compensation_versions_fixed_frequency_check check (
    fixed_frequency is null or fixed_frequency in ('weekly', 'monthly')
  ),
  constraint artist_compensation_versions_commission_cap_frequency_check check (
    commission_cap_frequency is null or commission_cap_frequency in ('weekly', 'monthly')
  ),
  constraint artist_compensation_versions_fixed_amount_non_negative_check check (
    fixed_amount_minor is null or fixed_amount_minor >= 0
  ),
  constraint artist_compensation_versions_cap_amount_non_negative_check check (
    commission_cap_amount_minor is null or commission_cap_amount_minor >= 0
  ),
  constraint artist_compensation_versions_commission_rate_range_check check (
    commission_rate_bps is null or (commission_rate_bps >= 1 and commission_rate_bps <= 10000)
  ),
  constraint artist_compensation_versions_effective_range_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint artist_compensation_versions_structure_check check (
    (
      pay_chair_rent = false
      and rent_type is null
      and fixed_frequency is null
      and fixed_amount_minor is null
      and commission_rate_bps is null
      and commission_capped is null
      and commission_cap_frequency is null
      and commission_cap_amount_minor is null
    )
    or
    (
      pay_chair_rent = true
      and (
        (
          rent_type = 'fixed'
          and fixed_frequency is not null
          and fixed_amount_minor is not null
          and commission_rate_bps is null
          and commission_capped is null
          and commission_cap_frequency is null
          and commission_cap_amount_minor is null
        )
        or
        (
          rent_type = 'commission'
          and fixed_frequency is null
          and fixed_amount_minor is null
          and commission_rate_bps is not null
          and (
            (
              commission_capped = true
              and commission_cap_frequency is not null
              and commission_cap_amount_minor is not null
            )
            or
            (
              commission_capped = false
              and commission_cap_frequency is null
              and commission_cap_amount_minor is null
            )
          )
        )
      )
    )
  )
);

do $$
begin
  if to_regclass('public.artist_compensation_settings') is not null then
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
      created_at,
      updated_at
    )
    select
      user_id,
      coalesce(updated_at, created_at, now()),
      null,
      pay_chair_rent,
      rent_type,
      fixed_frequency,
      fixed_amount_minor,
      commission_rate_bps,
      commission_capped,
      commission_cap_frequency,
      commission_cap_amount_minor,
      created_at,
      updated_at
    from public.artist_compensation_settings;
  end if;
end $$;

create unique index if not exists artist_compensation_versions_active_user_uidx
on public.artist_compensation_versions (user_id)
where effective_to is null;

create index if not exists artist_compensation_versions_user_effective_from_idx
on public.artist_compensation_versions (user_id, effective_from desc);

alter table public.artist_compensation_versions
drop constraint if exists artist_compensation_versions_no_overlap_excl;

alter table public.artist_compensation_versions
add constraint artist_compensation_versions_no_overlap_excl
exclude using gist (
  user_id with =,
  tstzrange(effective_from, coalesce(effective_to, 'infinity'::timestamptz), '[)') with &&
);

alter table public.artist_compensation_versions enable row level security;

drop policy if exists artist_compensation_versions_select_own on public.artist_compensation_versions;
create policy artist_compensation_versions_select_own
  on public.artist_compensation_versions
  for select
  using (auth.uid() = user_id);

drop policy if exists artist_compensation_versions_insert_own on public.artist_compensation_versions;
create policy artist_compensation_versions_insert_own
  on public.artist_compensation_versions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists artist_compensation_versions_update_own on public.artist_compensation_versions;
create policy artist_compensation_versions_update_own
  on public.artist_compensation_versions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on table public.artist_compensation_versions to authenticated;
grant all on table public.artist_compensation_versions to service_role;

alter table public.sessions
add column if not exists session_at timestamp with time zone;

update public.sessions
set session_at = coalesce(created_at, now())
where session_at is null;

alter table public.sessions
alter column session_at set not null;

alter table public.sessions
add column if not exists compensation_version_id uuid references public.artist_compensation_versions (compensation_version_id);

create index if not exists sessions_session_at_idx
on public.sessions (session_at desc);

create index if not exists sessions_compensation_version_id_idx
on public.sessions (compensation_version_id);

drop table if exists public.artist_compensation_settings cascade;
