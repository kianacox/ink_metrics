alter table public.profiles
add column if not exists display_name text;

alter table public.profiles
add column if not exists is_profile_complete boolean not null default false;

alter table public.profiles
add column if not exists profile_completed_at timestamp with time zone;

create table if not exists public.artist_compensation_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
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
  constraint artist_compensation_settings_rent_type_check check (
    rent_type is null or rent_type in ('fixed', 'commission')
  ),
  constraint artist_compensation_settings_fixed_frequency_check check (
    fixed_frequency is null or fixed_frequency in ('weekly', 'monthly')
  ),
  constraint artist_compensation_settings_commission_cap_frequency_check check (
    commission_cap_frequency is null or commission_cap_frequency in ('weekly', 'monthly')
  ),
  constraint artist_compensation_settings_fixed_amount_non_negative_check check (
    fixed_amount_minor is null or fixed_amount_minor >= 0
  ),
  constraint artist_compensation_settings_cap_amount_non_negative_check check (
    commission_cap_amount_minor is null or commission_cap_amount_minor >= 0
  ),
  constraint artist_compensation_settings_commission_rate_range_check check (
    commission_rate_bps is null or (commission_rate_bps >= 1 and commission_rate_bps <= 10000)
  ),
  constraint artist_compensation_settings_structure_check check (
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

alter table public.artist_compensation_settings enable row level security;

drop policy if exists artist_compensation_settings_select_own on public.artist_compensation_settings;
create policy artist_compensation_settings_select_own
  on public.artist_compensation_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists artist_compensation_settings_insert_own on public.artist_compensation_settings;
create policy artist_compensation_settings_insert_own
  on public.artist_compensation_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists artist_compensation_settings_update_own on public.artist_compensation_settings;
create policy artist_compensation_settings_update_own
  on public.artist_compensation_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on table public.artist_compensation_settings to authenticated;
grant all on table public.artist_compensation_settings to service_role;
