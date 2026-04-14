# inkMetrics

inkMetrics is a platform-agnostic business health app for tattoo artists. It focuses on lightweight session logging, authentication, and dashboard visibility without forcing artists to replace their booking workflow.

## Project Overview

- Primary goal: track sessions and business metrics with minimal data-entry friction
- Current scope: authenticated app with dashboard and session logging/listing flows
- Auth model: Supabase Auth with email/password and email confirmation support
- Data model: Supabase/Postgres with RLS-protected user data
- Product and slice specs: see [`docs/`](./docs)

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling/UI:** Tailwind CSS + shadcn/ui primitives
- **Backend/BaaS:** Supabase (Auth, Postgres, APIs)
- **Session/auth integration:** `@supabase/ssr`
- **Unit tests:** Jest + Testing Library
- **E2E tests:** Playwright
- **Local email testing:** Supabase local mail service (`http://127.0.0.1:54324`)

## Prerequisites

- Node.js 20+ (Node 24 recommended in this repo)
- npm
- Docker Desktop running (required for local Supabase)
- Supabase CLI access (`npx supabase login`) for schema sync from hosted project

## Local Development Setup

### 1) Install dependencies

```bash
npm ci
```

### 2) Configure environment

Create/update `.env.local` with local Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001
INBUCKET_BASE_URL=http://127.0.0.1:54324
```

To retrieve local keys:

```bash
npm run supabase:start
npm run supabase:status:env
```

### 3) Start the app + local database

```bash
npm run dev:local
```

This ensures local Supabase is started before launching Next.js.

## Running the App

- `npm run dev` - Next.js dev server only
- `npm run dev:local` - start local Supabase, then Next.js dev server
- `npm run build` - production build
- `npm run start` - serve built app

## Testing

### Unit tests

```bash
npm test
```

### Playwright E2E

Install browser dependencies once:

```bash
npm run test:e2e:install
```

Run full E2E:

```bash
npm run test:e2e
```

Run auth-only suite:

```bash
npm run test:e2e:auth
```

Run Playwright UI mode:

```bash
npm run test:e2e:ui
```

Run Playwright UI mode and ensure local Supabase is running:

```bash
npm run test:e2e:ui:local
```

In UI mode, select a test file (for example `tests/auth.spec.ts`) and run tests interactively.

The Playwright global setup resets local Supabase DB before runs (`supabase db reset --local --yes`) for a clean test state.

### Seeded E2E users

Local DB reset also applies [`supabase/seed.sql`](./supabase/seed.sql), which creates deterministic users for fast-path e2e journeys:

- `seeded-session-user@example.com` (profile complete)
- `seeded-incomplete-user@example.com` (profile incomplete)
- Password comes from `E2E_SEEDED_USER_PASSWORD` (or falls back to `E2E_SIGN_UP_PASSWORD`).

You can override these in tests with env vars:

```env
E2E_SIGN_UP_PASSWORD=<required-for-e2e>
E2E_SEEDED_SESSION_USER_EMAIL=seeded-session-user@example.com
E2E_SEEDED_INCOMPLETE_USER_EMAIL=seeded-incomplete-user@example.com
E2E_SEEDED_USER_PASSWORD=<optional; defaults to E2E_SIGN_UP_PASSWORD>
```

### Avoid duplicate DB resets in CI

If the workflow already ran `supabase db reset --local --yes` before `npm run test:e2e`, set:

```bash
PLAYWRIGHT_SKIP_DB_RESET=1
```

This skips Playwright global reset and avoids running reset twice in the same job.

## Supabase Workflow

### Local stack commands

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:status`
- `npm run supabase:status:env`
- `npm run supabase:db:reset`

### Sync hosted schema into local migrations

```bash
npm run supabase:schema:sync
```

This runs:

1. `supabase link --project-ref jllclqhtxkjbaqozugch`
2. `supabase db pull`

See [`supabase/README.md`](./supabase/README.md) for full details.

## CI Overview

- Unit tests workflow: [`.github/workflows/unit-tests.yml`](./.github/workflows/unit-tests.yml)
- Playwright auth E2E workflow: [`.github/workflows/playwright.yml`](./.github/workflows/playwright.yml)

## Project Structure

```text
app/                    Next.js routes (auth, dashboard, sessions)
components/             UI and feature components
lib/                    Supabase clients, auth guards, domain logic
tests/                  Playwright E2E tests + global setup
supabase/               Local Supabase config and migrations
.github/workflows/      CI workflows
docs/                   Product and slice specification docs
```

## Documentation

- Product context/spec: [`docs/ink_metrics.spec.md`](./docs/ink_metrics.spec.md)
- Slice 1 scope/checklist: [`docs/slice1.spec.md`](./docs/slice1.spec.md)
