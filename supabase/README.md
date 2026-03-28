# Supabase (Ink Metrics)

Schema (including `Sessions.session_duration`) is maintained in your Supabase project. Tables are **PascalCase** (`Clients`, `Sessions`); the JS client uses `.from("Clients")` / `.from("Sessions")`. This folder documents RLS and auth URL setup only.

## Row Level Security

If inserts from the app fail with an RLS error, ensure `Clients` and `Sessions` allow authenticated users to manage only their own rows (`user_id = auth.uid()`). Example policies (adjust names if yours differ; use quoted identifiers for case-sensitive tables):

```sql
alter table public."Clients" enable row level security;
alter table public."Sessions" enable row level security;

create policy "clients_select_own"
  on public."Clients" for select
  using (auth.uid() = user_id);

create policy "clients_insert_own"
  on public."Clients" for insert
  with check (auth.uid() = user_id);

create policy "clients_update_own"
  on public."Clients" for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_select_own"
  on public."Sessions" for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public."Sessions" for insert
  with check (auth.uid() = user_id);
```

## Auth redirect URLs

Allow your site origin and email confirmation URLs, e.g.:

- `http://localhost:3000/auth/confirm`
- `https://<your-domain>/auth/confirm`

Include query strings as required by your Supabase auth settings.
