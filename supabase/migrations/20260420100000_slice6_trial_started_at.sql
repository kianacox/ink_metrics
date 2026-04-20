alter table public.profiles
  add column if not exists trial_started_at timestamp with time zone;
