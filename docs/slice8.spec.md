# Slice 8 Spec: Metrics Persistence and Monthly Snapshot Engine

## 1) Purpose

Introduce a persisted monthly analytics layer so metrics can be reused for historical analysis and consumed by reporting/export workflows without recalculating all source rows on every request.

This slice follows Slice 7 reporting and hardens long-term analytics storage for seasonality and month-over-month comparisons.

## 2) Goals

- Persist monthly analytics snapshots per artist with deterministic formulas.
- Keep persisted values aligned with Slice 5 live metric formulas and timezone contracts.
- Support fast read access for report history and future trend surfaces.
- Provide safe recomputation when sessions, expenses, or compensation changes affect prior months.
- Preserve strict per-user ownership via RLS and authenticated APIs.

## 3) Scope

### 3.1 In Scope

- New `monthly_analytics_snapshots` table in `public` schema.
- Snapshot generation service for one user + one month window.
- Upsert behavior for mutable months and finalized behavior for closed months.
- Read API for snapshot list/detail used by reporting/history flows.
- Recompute queue/job scaffolding and invalidation trigger points.
- Unit/integration/e2e coverage for persistence correctness.

### 3.2 Out of Scope

- Net-new export format UX (handled in Slice 7).
- Predictive analytics and forecasting.
- Tax filing integrations with third-party systems.

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

- Persist money values in minor units (`bigint`).
- Persist counts as integer.
- Persist ratios as fixed precision numeric.
- Persist duration as:
  - `hours_tattooing_minutes_total` (source of truth),
  - `hours_tattooing_hours_numeric` (display convenience).

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

Persistence must call the same domain calculator logic used for Slice 5 live analytics.

Required:

- No duplicated formula implementations across live and persisted paths.
- Snapshot generation references shared analytics module and shared timezone boundary helper.

## 5) Security and Authorization

### 5.1 RLS

Enable RLS on `public.monthly_analytics_snapshots`.

Policies:

- `select` own rows only
- `insert` own rows only
- `update` own rows only
- `delete` own rows only (if delete endpoint is supported)

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

- `GET /api/analytics/monthly-snapshots`
- `GET /api/analytics/monthly-snapshots/[monthStartLocalDate]`

List endpoint behavior:

- returns snapshots for current user ordered by `month_start_local_date desc`
- supports optional `limit` and cursor pagination

Detail endpoint behavior:

- returns single snapshot for requested month if owned by user
- returns `404` when month snapshot does not exist

### 6.2 Recompute endpoint

Add authenticated endpoint:

- `POST /api/analytics/monthly-snapshots/recompute`

Payload:

- `monthStartLocalDate`
- optional `force` (default `false`)

Behavior:

- recompute snapshot using shared Slice 5 calculator
- upsert mutable snapshot row
- reject `force=false` recompute when target row is finalized

### 6.3 API response contract

Return fields for historical reporting/trend consumers:

- window metadata
- all top-level persisted metrics
- category expense breakdown
- lifecycle metadata (`is_finalized`, `computed_at`, `source_version`)

## 7) Recompute and Invalidations

### 7.1 Trigger events

Writes that impact metrics enqueue recomputation for affected months:

- session create/update/delete
- expense create/update/delete
- compensation version changes that alter effective ranges
- profile timezone changes (requires broader backfill strategy)

### 7.2 Job model

Add queue table or equivalent job mechanism:

- `analytics_snapshot_jobs` with dedupe key `(user_id, month_start_local_date, reporting_timezone)`
- statuses: `queued`, `running`, `succeeded`, `failed`
- retry with bounded backoff

### 7.3 Deduping

Multiple writes affecting same month should collapse into one pending recompute job.

## 8) Query and Performance Requirements

- Snapshot reads should be O(1) on unique key path and O(log n) for month list scans.
- Avoid full historical raw-table scans during report/history views by reading persisted rows.
- Add indexes:
  - `(user_id, month_start_local_date desc)`
  - unique `(user_id, month_start_local_date, reporting_timezone)`
  - optional partial index on `(user_id, is_finalized)` if frequently filtered.

## 9) Frontend/UX Requirements (Slice 8 scope only)

- Expose reusable data clients/hooks for snapshot list and detail consumers.
- Surfaces relying on snapshots must show:
  - loading state
  - empty state when no snapshots exist
  - stale/recomputing state when snapshot refresh is in progress

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

- user with historical data can view snapshot history
- triggering recompute updates current month snapshot values
- user cannot access another user's snapshot by route tampering

## 11) PR Delivery Plan

### PR 1: Data model and security

- migration for `monthly_analytics_snapshots`
- RLS policies and grants
- indexes and constraints
- unit tests for schema-adjacent contracts

### PR 2: Snapshot compute service

- shared snapshot builder using Slice 5 analytics module
- upsert/finalize rules
- source-version tagging
- unit tests for compute and lifecycle logic

### PR 3: Read/recompute APIs

- list/detail/recompute endpoints
- auth guard and error sanitization
- integration tests

### PR 4: Invalidation and job scaffolding

- queue table or equivalent worker path
- write-event enqueue hooks
- dedupe and retry behavior
- integration tests

### PR 5: Hardening

- consumer wiring improvements
- stale/recompute state handling
- e2e coverage and performance verification

## 12) Acceptance Criteria

- Snapshot row can be created and read for current user/month.
- Snapshot values exactly match Slice 5 formulas for same month window/timezone.
- Recompute updates mutable snapshots and respects finalize guard.
- Snapshot APIs enforce per-user access boundaries.
- Historical snapshot retrieval remains performant under expected dataset size.
