# Slice 6 Spec: Landing Page and Marketing

## 1) Purpose

Ship a polished public-facing landing page and marketing surface that communicates product value, captures intent, and converts visitors into signed-in users.

This slice focuses on acquisition and positioning while preserving the existing authenticated product experience.

## 2) Goals

- Launch a clear, credible marketing page for `ink_metrics`.
- Improve signup conversion from public traffic.
- Communicate core product value with concise messaging and proof points.
- Keep implementation lightweight, performant, and mobile-first.
- Ensure analytics and SEO foundations are in place for iteration.

## 3) Scope

### 3.1 In Scope

- Public landing page route and content sections.
- CTA flows into existing auth/signup routes.
- Responsive layout and polished visual design.
- Basic SEO metadata and social preview tags.
- Product feature highlights aligned with shipped slices.
- Testimonials/placeholders only if real proof exists.
- Page-level analytics events for key marketing interactions.

### 3.2 Out of Scope

- Paid ad campaign setup and external ad platform configuration.
- Complex CMS/editorial workflow.
- Blog engine and long-form content system.
- Full brand redesign across authenticated app surfaces.

## 4) Content and Messaging Contract

### 4.1 Core narrative

Landing copy should consistently communicate:

- platform-agnostic workflow (does not replace booking flow),
- fast logging,
- actionable business insights,
- tax-ready reporting direction.

### 4.2 Claims guardrails

- Do not claim unshipped features as available.
- If referencing roadmap items, clearly mark as "coming soon."
- Avoid unverifiable quantitative claims unless backed by evidence.

### 4.3 CTA contract

Primary CTA:

- `Start free` (or chosen equivalent) -> signup route.

Secondary CTA:

- `View dashboard preview` or equivalent -> explanatory section or product tour content.

## 5) SEO and Metadata Requirements

- Unique page `<title>` and meta description.
- Open Graph tags (title, description, image).
- Twitter card metadata.
- Canonical URL.
- Structured heading hierarchy (`h1` once, then semantic sections).

## 6) Performance and Accessibility Requirements

- Mobile-first implementation.
- Prioritize Core Web Vitals:
  - avoid large render-blocking bundles,
  - optimize hero media assets,
  - lazy-load below-the-fold visuals when appropriate.
- Accessibility minimums:
  - keyboard navigable CTA/action elements,
  - sufficient color contrast,
  - semantic landmarks and headings,
  - descriptive alt text for meaningful media.

## 7) Analytics Requirements

Track marketing events:

- landing page viewed,
- primary CTA clicked,
- secondary CTA clicked,
- signup success redirect arrival (if feasible from existing flow).

Event naming should be deterministic and versioned where useful.

## 8) Routing and Integration Requirements

- Keep authenticated dashboard routes unchanged.
- Public landing route should not require auth.
- Authenticated users visiting landing page may be redirected to dashboard or shown a signed-in CTA state (choose one behavior and keep it consistent).

## 9) Testing Requirements

### 9.1 Unit/component tests

Cover:

- CTA links resolve to correct routes.
- Essential marketing sections render expected content blocks.
- Metadata helper output (if generated via utility).

### 9.2 Integration tests

Cover:

- landing route loads unauthenticated.
- signup CTA path returns expected auth page.
- signed-in behavior (redirect or alternate CTA state) matches product decision.

### 9.3 E2E tests

Cover:

- visitor can load landing page on mobile viewport.
- visitor can click primary CTA and reach signup flow.
- visitor can navigate back without layout breakage.

## 10) PR Delivery Plan

### PR 1: Foundation and structure

- route scaffold,
- semantic section layout,
- shared landing components.

### PR 2: Final copy and visuals

- approved messaging,
- hero/value sections,
- responsive styling polish.

### PR 3: SEO + analytics

- metadata tags,
- social cards,
- tracked CTA events.

### PR 4: Hardening

- accessibility pass,
- performance optimizations,
- end-to-end verification.

## 11) Acceptance Criteria

- Public users can access a polished, mobile-first landing page.
- Primary CTA reliably routes to signup/auth flow.
- Messaging accurately reflects shipped and upcoming capabilities.
- SEO/social metadata is present and correct.
- Marketing analytics events fire for core CTA interactions.
- Landing implementation does not regress authenticated dashboard behavior.
# Slice 6 Spec: Metrics Persistence and Monthly Snapshot Engine

## 1) Purpose

Introduce a persisted monthly analytics layer so dashboard metrics can be exported quickly and reused for historical analysis without recalculating all source rows on every request.

This slice creates the reporting foundation used by Slice 7 exports and future seasonality/month-over-month features.

## 2) Goals

- Persist monthly analytics snapshots per artist with deterministic formulas.
- Keep persisted values aligned with Slice 5 live metric formulas and timezone contracts.
- Support fast read access for reporting/export endpoints.
- Provide safe recomputation when sessions, expenses, or compensation changes affect prior months.
- Preserve strict per-user ownership via RLS and authenticated APIs.

## 3) Scope

### 3.1 In Scope

- New `monthly_analytics_snapshots` table in `public` schema.
- Snapshot generation service for one user + one month window.
- Upsert behavior for mutable months and finalized behavior for closed months.
- Read API for snapshot list/detail used by export/report UX.
- Recompute queue/job scaffolding and trigger points.
- Unit/integration/e2e coverage for persistence correctness.

### 3.2 Out of Scope

- PDF generation and final downloadable report UI (Slice 7).
- Seasonal trend charts in dashboard UI.
- Yearly tax filing workflows.
- Predictive or forecasting analytics.

## 4) Decisions and Data Contracts

### 4.1 Snapshot granularity and identity

One snapshot row represents one artist for one local month window.

Natural key:

- `user_id`
- `month_start_local_date`
- `reporting_timezone`

### 4.2 Time contract

- Month boundaries use `profiles.reporting_timezone`.
- Interval semantics are half-open: `[month_start_local, month_end_local)`.
- Persist UTC boundaries for traceability:
  - `window_start_utc`
  - `window_end_utc`

### 4.3 Currency and numeric contract

- Persist money values in minor units (bigint).
- Persist counts as integer.
- Persist ratios as numeric(8,6) or equivalent fixed precision.
- Persist duration as:
  - `hours_tattooing_minutes_total` (integer source of truth)
  - `hours_tattooing_hours_numeric` (presentation convenience)

### 4.4 Snapshot table fields (required)

Create `public.monthly_analytics_snapshots`:

- `snapshot_id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `month_start_local_date date not null`
- `month_end_local_date date not null`
- `reporting_timezone text not null`
- `currency_code text not null`
- `window_start_utc timestamptz not null`
- `window_end_utc timestamptz not null`
- `gross_take_home_minor bigint not null`
- `paid_to_studio_minor bigint not null`
- `total_expenses_minor bigint not null`
- `net_take_home_minor bigint not null`
- `retention_numerator integer not null`
- `retention_denominator integer not null`
- `retention_rate numeric not null`
- `session_count integer not null`
- `avg_profit_per_session_minor bigint not null`
- `hours_tattooing_minutes_total integer not null`
- `hours_tattooing_hours_numeric numeric not null`
- `expenses_by_category jsonb not null`
- `is_finalized boolean not null default false`
- `computed_at timestamptz not null default now()`
- `source_version text not null` (analytics formula version tag)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Uniqueness:

- unique index on `(user_id, month_start_local_date, reporting_timezone)`

### 4.5 Mutability rules

- Current month snapshots are mutable (`is_finalized = false`) and may be recomputed repeatedly.
- Closed month snapshots can be finalized (`is_finalized = true`).
- Recompute of finalized rows is allowed only via explicit admin/system pathway or dedicated backfill command.

### 4.6 Formula consistency contract

Slice 6 persistence must call the same domain calculator logic used for Slice 5 live analytics to prevent drift.

Required:

- No duplicated formula implementations across live and persisted paths.
- Snapshot generation references shared analytics module and shared timezone boundary helper.

## 5) Security and Authorization

### 5.1 RLS

Enable RLS on `public.monthly_analytics_snapshots`.

Policies:

- select own rows only
- insert own rows only
- update own rows only
- delete own rows only (if delete is allowed in API; otherwise omit)

Policy pattern:

- `auth.uid() = user_id`

### 5.2 API auth

All snapshot APIs require authenticated users.
Unauthenticated requests return `401`.

### 5.3 Error handling

- Do not return raw SQL/RPC internals.
- Return stable error codes/messages for client use.

## 6) API Requirements

### 6.1 Read endpoints

Add:

- `GET /api/reports/monthly-snapshots`
- `GET /api/reports/monthly-snapshots/[monthStartLocalDate]`

List endpoint behavior:

- returns snapshots for current user ordered by `month_start_local_date desc`
- supports optional `limit` + `cursor`

Detail endpoint behavior:

- returns single snapshot for requested month if owned by user
- returns `404` when month snapshot does not exist

### 6.2 Recompute endpoint

Add authenticated endpoint:

- `POST /api/reports/monthly-snapshots/recompute`

Payload:

- `monthStartLocalDate`
- optional `force` (default false)

Behavior:

- recompute snapshot using shared Slice 5 calculator
- upsert mutable snapshot row
- reject `force=false` recompute when target row is finalized

### 6.3 API response contract

Return fields required by Slice 7 exports:

- window metadata
- all top-level persisted metrics
- category expense breakdown
- snapshot lifecycle metadata (`is_finalized`, `computed_at`, `source_version`)

## 7) Recompute and Invalidations

### 7.1 Trigger events

Any write that impacts metrics should enqueue recomputation for affected months:

- session create/update/delete
- expense create/update/delete
- compensation version edit that changes effective range
- profile timezone changes (requires broader backfill plan)

### 7.2 Job model

Add queue table or equivalent job mechanism:

- `analytics_snapshot_jobs` with dedupe key `(user_id, month_start_local_date, reporting_timezone)`
- statuses: `queued`, `running`, `succeeded`, `failed`
- retry with bounded backoff

### 7.3 Deduping

Multiple writes affecting same month should collapse into one pending recompute job.

## 8) Query and Performance Requirements

- Snapshot reads should be O(1) on unique key path and O(log n) for month list scans.
- Avoid full historical raw-table scans during common dashboard/report views by reading persisted rows.
- Add indexes:
  - `(user_id, month_start_local_date desc)`
  - unique `(user_id, month_start_local_date, reporting_timezone)`
  - optional partial index on `(user_id, is_finalized)` if frequently filtered.

## 9) Frontend/UX Requirements (Slice 6 scope only)

- No final export UI yet, but provide reusable hooks/data clients for snapshot list and detail.
- Surfaces that rely on snapshots must show:
  - loading state
  - empty state when no snapshots exist
  - stale/recomputing state when current month snapshot is being regenerated

## 10) Testing Requirements

### 10.1 Unit tests

Cover:

- snapshot upsert behavior (new row vs update row)
- finalized row recompute guard logic
- invalidation month resolution logic from write timestamps
- dedupe key behavior for queued jobs
- source-version persistence

### 10.2 Integration/API tests

Cover:

- auth guard behavior on all snapshot routes
- list/detail endpoint ownership enforcement
- recompute endpoint success/failure branches
- stable response contract and error codes
- timezone correctness for month identity and UTC windows

### 10.3 End-to-end tests

Cover:

- user with seeded historical data sees monthly snapshots list
- triggering recompute updates current month snapshot values
- user cannot access another user's snapshot by route tampering

## 11) PR Delivery Plan

### PR 1: Data model and security

- migration for `monthly_analytics_snapshots`
- RLS policies + grants
- indexes and constraints
- unit tests for schema-adjacent contracts

### PR 2: Snapshot compute service

- shared snapshot builder using Slice 5 analytics module
- upsert/finalize rules
- source-version tagging
- unit tests for compute + lifecycle logic

### PR 3: Read/recompute APIs

- list/detail/recompute endpoints
- auth guard + error sanitization
- integration tests

### PR 4: Invalidation and job scaffolding

- queue table or equivalent worker trigger path
- write-event enqueue hooks
- dedupe and retry behavior
- integration tests

### PR 5: Consumer wiring and hardening

- reusable snapshot data client/hooks for Slice 7
- stale/recompute UX state plumbing
- e2e coverage and performance verification

## 12) Acceptance Criteria

- Snapshot row can be created and read for current user/month.
- Snapshot values exactly match Slice 5 formulas for same month window and timezone.
- Recompute updates mutable snapshots and respects finalize guard.
- Snapshot APIs enforce per-user access boundaries.
- Current and historical snapshot retrieval is performant under expected dataset size.
- Slice 7 can consume snapshot contracts without re-aggregating full raw tables by default.
