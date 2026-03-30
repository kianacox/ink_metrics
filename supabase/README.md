# Supabase (Ink Metrics)

Schema is maintained in your Supabase project. The app now uses lowercase table names:
- `clients` (primary key: `client_id`)
- `sessions` (primary key: `session_id`)
- `profiles` (primary key: `profile_id`)

Currency basics in Slice 1:
- `profiles.default_currency` defaults to `'GBP'` for new users.
- `sessions.currency` stores a currency code (`'GBP'` for now).
- `sessions.price` stores an integer in minor units.

## Row Level Security

The session logger **selects** existing clients by `user_id` and `name` before inserting. If there is **no `SELECT` policy** (or it is too strict), every save looks like a new client and triggers extra inserts. Add **`clients_select_own`** as below.

`clients` should use primary key **`client_id`** (uuid). There must be **no UNIQUE constraint on `user_id` alone**—that pattern allows only one client per artist and the second insert raises `23505`.

`sessions` should use a unique primary key per row (commonly **`session_id` uuid**). If the default on that column is missing or wrong, the second session insert can raise `23505` on the table primary key.

There must be **no UNIQUE constraint on `sessions.user_id` alone**, or only one session per artist is allowed.

If inserts from the app fail with an RLS error, ensure `clients`, `sessions`, and `profiles` allow authenticated users to manage only their own rows (`user_id = auth.uid()`). Example policies (adjust names if yours differ):

```sql
alter table public.clients enable row level security;
alter table public.sessions enable row level security;
alter table public.profiles enable row level security;

create policy "clients_select_own"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "clients_insert_own"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "clients_update_own"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_select_own"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Profile auto-creation

`supabase/create_profile_on_user_signup.sql` includes a trigger on `auth.users` that inserts a matching `profiles` row with `default_currency = 'GBP'`.

The app also upserts the profile during auth confirmation as a fallback to keep onboarding resilient.

## Auth redirect URLs

Allow your site origin and email confirmation URLs, e.g.:

- `http://localhost:3000/auth/confirm`
- `https://<your-domain>/auth/confirm`

Include query strings as required by your Supabase auth settings.
