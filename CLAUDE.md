# CLAUDE.md

This document teaches coding agents how to work effectively in `ink_metrics`.

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
- `npm run dev:local` (start Supabase + app)
- `npm run lint`
- `npm test`
- `npm run test:e2e`

Supabase helpers:

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:status`
- `npm run supabase:db:reset`

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
