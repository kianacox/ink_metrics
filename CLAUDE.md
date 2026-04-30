# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Intent

`ink_metrics` is a platform-agnostic business health app for tattoo artists. The app should provide financial visibility and operational insights without forcing users to change their booking workflow.

Primary source docs:

- `CONTEXT.md`

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
- `docs/` product and slice specs (deprecated — do not use)

### Supabase client types

Three client factories — use the right one:

| File                                             | When to use                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `lib/supabase/client.ts` (`createBrowserClient`) | Client components, browser context                                                  |
| `lib/supabase/server.ts` (`createServerClient`)  | Server components, API route handlers, auth-aware queries                           |
| `lib/supabase/admin.ts` (`createAdminClient`)    | Service-role operations only (e.g. seeding, bypassing RLS) — never expose to client |

### API route pattern

All authenticated route handlers follow this guard pattern:

```ts
const { supabase, user, errorResponse } =
  await requireAuthenticatedApiUser("message");
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
- Ensure new behavior is covered in the relevant domain.

## Agent Working Rules

When making changes:

1. Read the agent brief attached as a comment on your assigned GitHub issue
   before doing anything else. This is your source of truth — slice specs
   in `docs/` are deprecated and should be ignored.
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
- E2E tests pass for touched slice only (not full suite, to avoid DB reset conflicts).
- Lint passes for touched files.
- Type safety is preserved.
- Docs/spec references are still accurate if behavior changed.

## Orchestration and Parallel Agent Rules

This repo may be worked on by parallel agents running simultaneously via git
worktrees. Each agent operates in an isolated worktree under `./agents/`.

### If you are the orchestrator

1. Read `ISSUES.md` in the repo root — this is your task queue.
2. For each issue in the READY list:
   a. Create the worktree:
   `git worktree add ./agents/issue-{N} -b fix/issue-{N}`
   b. Spawn a worker Task for the issue. Wait for it to complete.
   c. If the worker wrote `FAILED.md` — stop, do not review, move to next issue.
   d. Once the worker completes successfully, spawn a reviewer Task with:
   - The full text of the agent brief from `gh issue view {N} --comments`
   - The full output of `git diff main...HEAD` from the worktree
   - No other context
   - These exact instructions:
     "You are a code reviewer. Review the diff against the brief.
     Return APPROVED or CHANGES REQUESTED with reasoning.
     Do not perform any other actions."
     e. If reviewer returns CHANGES REQUESTED:
   - Spawn a new worker Task with the reviewer's feedback appended to
     the original brief
   - Repeat review cycle. Maximum 3 iterations total.
   - If still not APPROVED after 3 iterations: write final review to
     `./agents/issue-{N}/REVIEW_FAILED.md` and move to next issue.
     f. If reviewer returns APPROVED:
   - Open the PR
   - Post review and QA plan as comments
3. Do not spawn more than 5 parallel workers at once.
4. After all issues complete, run `git worktree prune`.
5. After all issues are complete and PRs are opened, update `ISSUES.md`:
   - Move completed issues out of READY
   - Re-evaluate BLOCKED issues whose dependencies are now merged
   - Write a summary of what shipped to `COMPLETED.md`

### If you are a worker agent

1. Your working directory is your worktree only.
2. Read the agent brief from `gh issue view {N} --comments`.
3. Follow TDD — write failing tests first, implement, refactor.
4. Run checks:
   - `npm run lint`
   - `npm test` scoped to touched files
5. If any check fails: write output to `./FAILED.md` and stop.
6. If all checks pass: write `./READY_FOR_REVIEW.md` with the full
   output of `git diff main...HEAD` and stop.
   Do not open PRs. Do not self-review.

### TDD requirement

All implementations must follow TDD. Before writing any implementation code:

1. Run `/tdd`
2. Write failing tests first
3. Implement until tests pass
4. Refactor

Never write implementation code without a failing test covering it first.

### Shared local state risks

These resources are shared across all worktrees and must not be stomped on:

- Supabase local instance (port 54321) — one agent running `db:reset` breaks all others
- `.env.local` — read-only, never modify
- `node_modules/` — read-only, never run `npm ci` mid-session
