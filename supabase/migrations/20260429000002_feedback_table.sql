-- Product feedback submitted by authenticated users.
-- Insert is performed via the user's session client; RLS scopes inserts to the
-- authenticated user's own row. There is no select policy: feedback is
-- write-only from the user's perspective.
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- Index used by the rate-limit lookup (user + recent created_at).
create index feedback_user_id_created_at_idx
  on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

create policy "Users can insert own feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);
