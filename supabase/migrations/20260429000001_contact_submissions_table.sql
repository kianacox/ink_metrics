-- Contact form submissions: written server-side via the service-role client.
-- No RLS — this table must never be exposed to the public anon role.
create table public.contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text not null,
  message     text not null,
  ip_address  text,
  created_at  timestamptz not null default now()
);

-- Index used by the rate-limit lookup (ip + recent created_at).
create index contact_submissions_ip_created_at_idx
  on public.contact_submissions (ip_address, created_at desc);

-- Belt-and-braces: revoke any direct access from the anon and authenticated roles.
revoke all on table public.contact_submissions from anon, authenticated;
