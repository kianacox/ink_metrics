# Supabase (Ink Metrics)

Schema (including `Sessions.session_duration`) is maintained in your Supabase project. Tables are **PascalCase** (`Clients`, `Sessions`); the JS client uses `.from("Clients")` / `.from("Sessions")`. This folder documents RLS and auth URL setup only.

## Row Level Security

The session logger **selects** existing clients by `user_id` and `name` before inserting. If there is **no `SELECT` policy** (or it is too strict), every save looks like a new client and triggers extra inserts. Add **`clients_select_own`** as below.

`"Clients"` should have primary key **`id`** (uuid). There must be **no UNIQUE constraint on `user_id` alone**—that pattern (constraint name often `Clients_user_id_key`) allows only one client per artist and the second insert raises `23505`. If needed, run `supabase/drop_clients_user_id_unique.sql` in the SQL editor.

`"Sessions"` should use a unique primary key per row (commonly **`session_id` uuid**). If the default on that column is missing or wrong, the second session insert can raise **`23505` on `Sessions_pkey`**. The app passes an explicit `session_id` on insert; if your PK column is named **`id`** instead, rename the field in the app insert to match or set `default gen_random_uuid()` on the PK in Supabase.

There must be **no UNIQUE constraint on `Sessions.user_id` alone** (often `Sessions_user_id_key`), or only one session per artist is allowed. If needed, run `supabase/drop_sessions_user_id_unique.sql`.

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
