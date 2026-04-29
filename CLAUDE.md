# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Intent

`ink_metrics` is a platform-agnostic business health app for tattoo artists. The app should provide financial visibility and operational insights without forcing users to change their booking workflow.

Primary source docs:

- `docs/ink_metrics.spec.md` (product context and roadmap)
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
- `docs/` product and slice specs

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
2. For each issue in the READY list, spawn a parallel Task with:
   - The issue number, title, and scope from ISSUES.md
   - The worktree path: `./agents/issue-{N}`
   - This instruction: "Read CLAUDE.md, implement the issue, run checks, open a PR"
3. Create each worktree before spawning:
   `git worktree add ./agents/issue-{N} -b fix/issue-{N}`
4. Do not spawn more than 5 parallel tasks.
5. Do not spawn tasks for issues marked BLOCKED.
6. After all tasks complete, run `git worktree prune`.

### If you are a worker agent

1. Your working directory is your worktree only — never touch files outside it.
2. Read the agent brief from your assigned GitHub issue comments before making
   any changes. Fetch it with:
   `gh issue view {N} --comments`
   The brief is the comment marked "generated by AI during triage". This is
   your sole spec — do not rely on anything in `docs/`.
3. Follow all rules in "Agent Working Rules" above.
4. Run checks in this order before opening a PR:
   - `npm run lint`
   - `npm test` (scoped to touched files where possible)
   - If you touched a user-visible flow, identify the relevant Playwright spec
     in `tests/` based on the files you changed, then run it directly:
     `npx playwright test {spec-file}`
     Never run `npm run test:e2e` — this resets the shared DB and will
     break other parallel agents.
5. If **all checks pass**: `gh pr create --title "fix: {title}" --body "Closes #{N}"`
6. Immediately after opening the PR, write `QA_PLAN.md` to your worktree root
   and post it as a comment:
```bash
   gh pr comment {PR_NUMBER} --body "$(cat QA_PLAN.md)"
```

   `QA_PLAN.md` must follow this structure:

   ~~~markdown
   ## QA Plan

   > *Generated by agent for human review.*

   ### What was changed
   - One-line summary of each file touched and why.

   ### Happy path tests
   Step-by-step instructions a human can follow in the browser to verify the
   feature works. Include exact URLs, button labels, input values, and
   expected outcomes at each step.

   ### Edge cases to verify
   - Each edge case the implementation handles, with steps to trigger it.

   ### What was NOT tested
   - Any flows the agent could not cover (e2e skipped, external services,
     manual-only scenarios) and why.

   ### Rollback notes
   - What to revert if this PR causes a regression. Name the files and
     behaviour to watch for.
   ~~~

   Write the QA plan from the perspective of someone who did not implement
   the change. Assume the reviewer has access to the running app but has
   not read the code.
7. If **any check fails**: write the failure output to `./FAILED.md` in your
   worktree and stop. Do not open a PR.
8. Do not run `npm run supabase:db:reset` unless you added a migration — it
   resets shared local state and will break other parallel agents.

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
