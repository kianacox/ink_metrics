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
# Required for /contact form delivery via Resend (server-side only).
RESEND_API_KEY=<resend api key>
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

### Seeded test users

Local DB reset also applies [`supabase/seed.sql`](./supabase/seed.sql), which creates deterministic users for fast-path e2e journeys. All users except the demo user share password `Password123!`. The demo user password is `Password123` (no `!`).

| Email | Password | Profile | Purpose |
|---|---|---|---|
| `seeded-session-user@example.com` | `Password123!` | Complete — "Seeded Session User", GBP, Europe/London | Auth happy path; logged-in dashboard state with no sessions |
| `seeded-incomplete-user@example.com` | `Password123!` | Incomplete — no display name | Profile-setup redirect; `Next` button disabled until name entered |
| `test@test.com` | `Password123` | Complete — "Demo Artist", GBP, Europe/London | Full data fixture: 41 sessions, 11 clients (incl. action-signal clients), 15 expenses spanning Jan–Apr 2026; 25% house commission capped at £250/week |
| `seeded-tz-user@example.com` | `Password123!` | Complete — "Tokyo TZ User", USD, Asia/Tokyo (UTC+9) | Date-boundary QA for ahead-of-UTC timezones; 2 sessions, 2 clients |
| `seeded-la-user@example.com` | `Password123!` | Complete — "LA TZ User", USD, America/Los_Angeles (UTC−8) | Date-boundary QA for behind-UTC timezones; 16 sessions, 5 clients, 8 expenses |
| `seeded-retention-thin@example.com` | `Password123!` | Complete — "Retention Thin User", GBP, Europe/London | Retention widget "not enough data" state: 2 sessions, 2 clients (below both thresholds) |
| `seeded-retention-boundary@example.com` | `Password123!` | Complete — "Retention Boundary User", GBP, Europe/London | Retention widget real-rate state: 4 sessions, 3 clients (1 returning → 33%); sits exactly at the minimum-data threshold |

#### Demo user action-signal clients

The demo user (`test@test.com`) includes four clients designed to trigger specific action states on the Actions tab:

| Client | Action signal | Setup |
|---|---|---|
| Ravi Sharma | `lapsed_repeat` | 2 sessions, last Jan 22 2026 (≥56 days before Apr 20) |
| Zoe Campbell | `lapsed_repeat` | 3 sessions, last Feb 10 2026 (≥56 days before Apr 20) |
| Finn O'Connor | `new_client` | 1 session, Feb 15 2026 (≥42 days before Apr 20) |
| Dana Cross | `in_progress` | 2 sessions, most recent Mar 10 2026 marked `in_progress=true` (≥28 days) |

#### Test case guidance by user

- **Auth flows** (sign-up, login, logout, password reset): use `seeded-session-user@example.com`
- **Profile setup / onboarding gate**: use `seeded-incomplete-user@example.com`
- **Session CRUD, expense CRUD, client CRUD, analytics**: use `test@test.com` (rich fixture data)
- **Timezone edge cases** (date shown correctly across UTC boundaries): use the Tokyo or LA users
- **Retention widget — insufficient data message**: use `seeded-retention-thin@example.com`
- **Retention widget — real percentage display**: use `seeded-retention-boundary@example.com`
- **Client Actions tab**: use `test@test.com` (action-signal clients are pre-seeded)

#### Environment variable overrides

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
