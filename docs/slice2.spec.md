# Slice 2 Spec: Profile Setup and Profile Management

## 1) Purpose

Define requirements for profile setup, profile edit, compensation versioning, timezone handling, and account settings.

## 2) Goals

- Gate dashboard access until profile setup is complete.
- Capture compensation settings in a structured model that supports historical accuracy.
- Support profile editing without allowing default currency changes.
- Introduce account settings actions for email update and account deletion.

## 3) User Experience Requirements

### 3.1 Navigation

- Profile is accessible from app navigation:
  - Mobile/tablet: bottom menu.
  - Desktop: left sidebar menu.

### 3.2 Setup and Edit Rules

- New users must complete profile setup before using dashboard routes.
- Users can edit:
  - `display_name`
  - compensation settings
  - reporting timezone
- `default_currency` is set during initial setup and is not editable afterward.

### 3.3 Required Setup Inputs

1. Name
2. Default currency (`GBP`, `USD`, `EUR`)
3. Chair rent (`Yes` / `No`)
4. If chair rent is `Yes`, require compensation details:
   - Fixed rate flow:
     - frequency (`weekly` or `monthly`)
     - fixed amount
   - Commission flow:
     - commission rate
     - commission capped (`Yes` / `No`)
     - if capped: cap frequency (`weekly` or `monthly`) and cap amount

## 4) Domain Decisions

### 4.1 Profile Completion Gating

- `profiles.is_profile_complete` is the source of truth for gating.
- If `is_profile_complete = false`, redirect authenticated users to profile setup.
- If `is_profile_complete = true`, allow dashboard route access.

### 4.2 Compensation Modeling

- Use a typed relational model.
- Do not store compensation config as JSON.
- Use versioned compensation rows so historical sessions remain linked to effective settings.

## 5) Data Contract

### 5.1 `profiles` fields

- `is_profile_complete boolean not null default false`
- `profile_completed_at timestamptz null`
- `display_name text null`
- `reporting_timezone text not null default 'Europe/London'` (IANA timezone)
- `week_starts_on smallint not null default 1` (`1 = Monday`)

Rules:

- `default_currency` is immutable after setup completion.
- `is_profile_complete` can only be set to `true` when profile + compensation are valid.

### 5.2 `artist_compensation_versions` table

- `compensation_version_id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `effective_from timestamptz not null`
- `effective_to timestamptz null`
- `pay_chair_rent boolean not null`
- `rent_type text null` (`fixed` or `commission`)
- `fixed_frequency text null` (`weekly` or `monthly`)
- `fixed_amount_minor bigint null`
- `commission_rate_bps integer null` (1..10000)
- `commission_capped boolean null`
- `commission_cap_frequency text null` (`weekly` or `monthly`)
- `commission_cap_amount_minor bigint null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Storage conventions:

- Store money as minor units (`*_minor`).
- Store percentages as basis points (`*_bps`).

## 6) Validation and Constraint Rules

### 6.1 Structural compensation rules

- If `pay_chair_rent = false`, all compensation detail fields must be `null`.
- If `rent_type = fixed`, fixed fields are required and commission fields are `null`.
- If `rent_type = commission`, `commission_rate_bps` is required.
- If `commission_capped = true`, cap fields are required.
- If `commission_capped = false`, cap fields must be `null`.
- Monetary fields must be non-negative.

### 6.2 Temporal integrity rules

- `effective_to > effective_from` when `effective_to` is not null.
- No overlapping effective ranges per user.
- Exactly one active row per user (`effective_to is null`).

Suggested DB enforcement:

- Partial unique index on active row: unique `(user_id)` where `effective_to is null`.
- Exclusion constraint on user + `tstzrange(effective_from, effective_to)`.
- Index on `(user_id, effective_from desc)`.

### 6.3 Timezone validation rules

- Timezone must be selected from predefined IANA values (no free text).
- Persist canonical IANA ID (for example, `Europe/London`).
- Validate timezone server-side before write.
- Prefill timezone from browser timezone when available.
- Do not auto-mutate stored timezone from request headers after setup.

## 7) Time and Reporting Contract

- Timezone source of truth: `profiles.reporting_timezone`.
- Weekly boundary: local Monday `00:00:00`.
- Monthly boundary: local first day of month `00:00:00`.
- Interval semantics for period windows: half-open `[start, end)`.

Session timestamp requirements:

- `sessions.session_at timestamptz not null`.
- `sessions.created_at` remains insertion/audit time only.
- Compensation resolution and reporting logic must use `session_at`, not `created_at`.

## 8) Write Flows

### 8.1 Initial profile setup write flow

Execute as one transaction:

1. Insert first `artist_compensation_versions` row (`effective_from = now()`, `effective_to = null`).
2. Update profile fields.
3. Set `is_profile_complete = true` and `profile_completed_at = now()` only when validation passes.

Retry rule:

- If setup is retried and profile is still incomplete, allow update.
- If setup is replayed after completion, reject replay.

### 8.2 Compensation edit write flow

Execute as one transaction:

1. Lock active compensation row.
2. Set existing active row `effective_to = now()`.
3. Insert new active row with `effective_from = now()` and `effective_to = null`.
4. Commit.

`effective_from` is system-assigned (`now()`), not user-provided.

## 9) Read Flows

Compensation resolution for a session at `session_at`:

- `effective_from <= session_at`
- and (`effective_to is null` or `session_at < effective_to`)

For weekly/monthly fixed rent and commission caps, aggregate using artist-local period buckets derived from `session_at` + `reporting_timezone`.

Optional optimization:

- Add `sessions.compensation_version_id uuid null references artist_compensation_versions(compensation_version_id)`.
- Resolve and store active compensation version at session creation.
- Prefer this FK in analytics queries where appropriate.

## 10) Profile Settings Experience

Add a tabbed profile page with:

- `Profile` tab: existing profile form experience.
- `Settings` tab: account-level actions.

Settings tab requirements:

- Allow email update.
- Allow account deletion from a dedicated destructive section.
- Account deletion must require explicit confirmation modal.
- Reuse/extract existing delete-confirm modal pattern where possible.
- Mobile-first styling consistent with the rest of the app.

## 11) API and Form Requirements

- Profile setup/edit endpoints must validate all required fields and compensation combinations.
- Session creation must require session datetime input and persist UTC `session_at`.
- API input must validate timezone and timestamp values.
- Backfill migration is required for seeded/legacy session rows.

## 12) Rollout Constraints

- Use direct cutover.
- Do not keep `artist_compensation_settings` as a long-term transitional model.
- Move compensation reads/writes to `artist_compensation_versions` in the same release.
- For legacy local/staging data, run one-time reset/backfill and remove old model usage.
- Avoid dual-write compatibility layers.

## 13) Acceptance Criteria

- Newly verified users are redirected to setup until completion.
- Incomplete users are redirected back to setup on later visits/logins.
- Valid fixed-rate setup persists and marks profile complete.
- Valid commission setup persists and marks profile complete.
- Invalid compensation combinations cannot be persisted.
- Editing compensation creates a new version; historical rows remain unchanged.
- At most one active compensation version exists per user.
- Overlapping compensation periods are rejected.
- Reporting uses `session_at` with artist-local boundaries.
- Reporting timezone persists as canonical IANA ID and rejects invalid values.
- Session creation requires date/time and stores `session_at`.
- Historical sessions compute with compensation effective at session time.
- Settings tab supports email update and confirmed account deletion.
