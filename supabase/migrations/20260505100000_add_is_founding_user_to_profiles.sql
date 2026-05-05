alter table public.profiles
  add column if not exists is_founding_user boolean not null default false;

-- Backfill: every profile that exists at the time this migration runs is a
-- pre-marketing account and counts toward the 50-spot founding cap.
update public.profiles
  set is_founding_user = true;
