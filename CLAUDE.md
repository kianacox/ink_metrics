# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Intent

`ink_metrics` is a platform-agnostic business health app for tattoo artists. The app should provide financial visibility and operational insights without forcing users to change their booking workflow.

Primary source docs:

- `docs/ink_metrics.spec.md` (product context and roadmap)
- `docs/slice1.spec.md` (auth + session logging)
- `docs/slice2.spec.md` (profile page)
- `docs/slice3.spec.md` (clients tracking)

## Stack and Architecture

- Frontend: Next.js App Router + TypeScript
- UI: Tailwind + shadcn/ui primitives
- Backend: Next.js route handlers
- Data/Auth: Supabase (Postgres + Auth + RLS)
- E2E: Playwright
- Unit tests: Jest + Testing Library

High-level structure:

- `app/` route segments and API routes
- `components/` feature and shared UI components
- `lib/` Supabase clients, domain logic, guards, utilities
- `tests/` Playwright specs and global setup
- `supabase/` migrations, local config, seed data
- `docs/` product and slice specs

### Supabase client types

Three client factories — use the right one:

| File | When to use |
|------|------------|
| `lib/supabase/client.ts` (`createBrowserClient`) | Client components, browser context |
| `lib/supabase/server.ts` (`createServerClient`) | Server components, API route handlers, auth-aware queries |
| `lib/supabase/admin.ts` (`createAdminClient`) | Service-role operations only (e.g. seeding, bypassing RLS) — never expose to client |

### API route pattern

All authenticated route handlers follow this guard pattern:

```ts
const { supabase, user, errorResponse } = await requireAuthenticatedApiUser("message");
if (errorResponse) return errorResponse;
```

Error responses use `NextResponse.json({ error, code }, { status })`. Error codes are screaming-snake-case prefixed by domain (e.g. `EXPENSES_FETCH_FAILED`).

### Cursor pagination

List endpoints use composite cursor pagination (`lib/pagination/cursor.ts`). The cursor encodes `{ sortValue, id }` as base64. Queries use `.or()` with `lt`/`eq` on the sort column plus `lt` on id to page correctly across ties.

### Migrations

Migration files live in `supabase/migrations/` and are named `YYYYMMDDHHMMSS_description.sql`. After adding a migration, run `npm run supabase:db:reset` to apply it locally. The e2e global setup (`tests/global-setup.ts`) calls `supabase db reset` before every Playwright run, so all tests start from the seeded state.

### E2E test infrastructure

- `tests/global-setup.ts` — resets the local DB before each run (skippable via `PLAYWRIGHT_SKIP_DB_RESET=1`)
- `tests/auth-helpers.ts` — `loginAsSeededUser(page, "sessionComplete" | "incomplete")` for seeded fixture users
- `tests/*-helpers.ts` — per-domain helpers (navigation, CRUD actions, assertions) imported by specs
- Base URL is configured in `playwright.config.ts` pointing to the local dev server

The `@/` path alias maps to the repo root in both TypeScript (`tsconfig.json`) and Jest (`moduleNameMapper`).

## Delivery Model

Work ships in vertical slices. Prefer complete, testable increments over broad partial refactors.

Current roadmap:

1. Auth and sessions
2. Profile page
3. Client tracking
4. Expense tracking
5. Analytics dashboard
6. Monthly reports and imports
7. Plan limits

## Local Development

Common commands:

- `npm ci`
- `npm run dev`
- `npm run dev:local` (start Supabase + app together)
- `npm run lint`
- `npm test` (all unit tests)
- `npm run test:e2e` (all Playwright tests — requires Docker + Supabase running)

Run a single unit test file:

```
npx jest fetch-expenses-page
```

Run a single e2e spec file:

```
npx playwright test expense-tracking
```

Other test commands: `npm run test:watch`, `npm run test:coverage`, `npm run test:e2e:ui:local`

Supabase helpers:

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:status`
- `npm run supabase:db:reset`

Required environment variables (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (service role — server-side only)

## Testing Expectations

Always maintain confidence with automated tests.

- Add or update unit tests for domain and utility logic.
- Add or update Playwright tests for user-visible flows.
- Keep e2e selectors robust (prefer roles and stable IDs).
- Ensure new behavior is covered in the relevant slice area.

## Agent Working Rules

When making changes:

1. Read related slice spec(s) first.
2. Keep changes scoped to the requested behavior.
3. Preserve existing features unless explicitly changing them.
4. Prefer clear names and avoid magic numbers.
5. Extract repeated logic instead of copy/paste.
6. Keep components and functions single-purpose.
7. Run lint/tests relevant to touched areas before finalizing.

## Data and Security Notes

- Use Supabase auth context and ownership checks for all user data paths.
- Respect RLS assumptions; do not bypass ownership boundaries.
- Never commit secrets (`.env*`, keys, credentials).
- Treat destructive account/session operations as high-risk and test them.

## Change Quality Checklist

Before marking work done:

- Feature behavior matches requested scope.
- Tests added/updated and passing for touched areas.
- Full e2e test suite passes locally.
- Lint passes for touched files.
- Type safety is preserved.
- Docs/spec references are still accurate if behavior changed.
