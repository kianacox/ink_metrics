# Slice 2: Profile Setup

## Overview

Artists should be prompted to set up their profile after sign-up.  
If profile setup is not completed, they should be prompted again on the next login or app visit.

New users must not be able to access the dashboard until profile setup is complete.

## Access and Navigation

- The profile page should be easy to find from the dashboard.
- On mobile/tablet: access via the bottom menu.
- On desktop: access via the left sidebar menu.

This will be setup after creating the initial form.

## Edit Rules

- Artists can edit all profile fields **except** default currency.

## Required Profile Questions

1. **Name**
2. **Default currency** (`GBP`, `USD`, or `EUR`)
3. **Do you pay chair rent?** (`Yes` / `No`)
4. If **Yes**:
   - Ask: **Do you pay commission or fixed rate?**

### Fixed Rate Flow

- Ask whether fixed rate is:
  - `Monthly`, or
  - `Weekly`
- Then ask for the fixed rate amount.

### Commission Flow

- Ask: **Is commission capped?** (`Yes` / `No`)
- If **Yes**, ask whether the cap is:
  - `Monthly`, or
  - `Weekly`
- Then ask for the commission percentage.

## Profile Completion Gating

Because sign-up uses email verification, profile completion needs an explicit state.

Proposed approach:

- Add a boolean field to `profiles` (for example, `is_profile_complete`).
- If `false`, automatically redirect user to profile setup until complete.

## Data Modeling Questions (To Decide)

We need a storage model that supports:

- fixed rate vs commission
- capped vs uncapped commission
- weekly vs monthly frequencies
- future calculations for metrics

This data must be persisted for later financial calculations, such as applying the artist take-home percentage to profit (for example, `0.7 * profit`) on both weekly and monthly views.

Open options:

1. Expand `profiles` with additional columns
2. Store structured rent/commission config in JSON
3. Create related tables (for example, fixed rates and commissions) linked by `user_id`

## Data Model and Constraints (Decision)

Use a typed relational model:

- Keep `profiles` for identity and lifecycle flags.
- Use a versioned compensation table as the single source of truth from day one.
- Do not store compensation config as JSON.

### `profiles` updates

Add fields:

- `is_profile_complete boolean not null default false`
- `profile_completed_at timestamptz null`
- `display_name text null`

Rules:

- `default_currency` is set during initial profile setup and is not editable afterward.
- `is_profile_complete` is set to `true` only when profile inputs are valid and compensation settings are valid.

### New table: `artist_compensation_versions`

One user can have many rows over time. Initial profile setup creates the first version row.

Fields:

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

### Validation constraints

Use DB constraints to enforce valid combinations:

- If `pay_chair_rent = false`, all rent detail fields must be `null`.
- If `rent_type = fixed`, `fixed_frequency` and `fixed_amount_minor` are required; commission fields must be `null`.
- If `rent_type = commission`, `commission_rate_bps` is required.
- If `commission_capped = true`, `commission_cap_frequency` and `commission_cap_amount_minor` are required.
- If `commission_capped = false`, cap fields must be `null`.
- Monetary amounts must be non-negative.
- `effective_to > effective_from` when `effective_to` is not null.
- No overlapping compensation ranges for the same user.
- Only one active compensation version per user (`effective_to is null`).

### Storage conventions

- Store money in minor units (`*_minor`) for exact arithmetic.
- Store percentages in basis points (`*_bps`) for precision and deterministic calculations.

### Upsert and writes

- Profile setup save should use a single transaction-style flow:
  1. Insert first row in `artist_compensation_versions` with `effective_from = now()` and `effective_to = null`.
  2. Update `profiles` with name and completion fields.
  3. Set `is_profile_complete = true` and `profile_completed_at = now()` only when all required data is valid.
- If a row already exists for the user during setup retry, update only if profile is still incomplete; otherwise reject setup replay.

### Gating behavior

- If `is_profile_complete = false`, authenticated users are redirected to profile setup and cannot access dashboard routes.
- If `is_profile_complete = true`, users can access dashboard routes normally.
- Profile route remains accessible after completion for edits, except default currency.

### Acceptance criteria

- A newly verified user is redirected to profile setup until completion.
- A user who leaves setup incomplete is redirected back to setup on next app visit/login.
- Saving a valid fixed-rate setup stores frequency and amount and marks profile complete.
- Saving a valid commission setup stores rate, optional cap settings, and marks profile complete.
- Invalid combinations cannot be persisted because DB constraints reject them.
- Existing users without setup data remain incomplete until they submit valid profile and compensation settings.

## Part 2: Profile Editing

Users should be able to edit their profile via a dedicated profile page, accessible from the bottom nav menu on mobile and the left menu on desktop.

Users can edit:

- `display_name`
- all compensation settings
- reporting timezone

`default_currency` remains locked after initial setup.

### Compensation history strategy (Decision)

Use effective-dated compensation versioning so historical sessions keep their original compensation rules.

Do not apply current settings retroactively to all historical sessions by default.

### Database model for compensation edits

Use the same `artist_compensation_versions` table introduced above for ongoing compensation edits.

#### New table: `artist_compensation_versions`

One user can have many rows over time.

Fields:

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

Validation rules (same structural rules as part 1):

- If `pay_chair_rent = false`, all rent detail fields must be `null`.
- If `rent_type = fixed`, fixed fields are required and commission fields are `null`.
- If `rent_type = commission`, `commission_rate_bps` is required.
- If `commission_capped = true`, cap fields are required.
- If `commission_capped = false`, cap fields are `null`.
- Money fields must be non-negative.

Temporal integrity rules:

- Exactly one active row per user (`effective_to is null`).
- No overlapping effective ranges for the same `user_id`.
- `effective_to > effective_from` when `effective_to` is not null.

Suggested indexes/constraints:

- Partial unique index for current row:
  - unique `(user_id)` where `effective_to is null`
- Exclusion constraint to prevent overlap by `user_id` + tstzrange
- Index on `(user_id, effective_from desc)`

### Profile table additions

Add:

- `reporting_timezone text not null default 'Europe/London'` (IANA timezone)
- `week_starts_on smallint not null default 1` (`1 = Monday`)

### Canonical period boundary contract

All weekly/monthly compensation logic uses artist-local time, not UTC boundaries.

- Timezone source of truth: `profiles.reporting_timezone`
- Weekly boundary: local Monday `00:00:00`
- Monthly boundary: first day of month local `00:00:00`
- Interval semantics: half-open `[start, end)` for all period windows

This prevents boundary double counting and avoids DST-related period drift.

### Timezone capture strategy

During profile setup/edit:

- Require user to confirm a `reporting_timezone`
- Timezone input must be a predefined IANA timezone selector (searchable combobox/dropdown), not free text
- UI labels should be user-friendly, but persisted value must be canonical IANA ID (for example, `Europe/London`)
- Prefill from browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Optionally use server geo as fallback hint only
- Persist user selection in `profiles.reporting_timezone`
- Do not auto-change stored timezone from headers after setup
- Validate timezone server-side against an allowlist/known IANA set before write

### Session timestamp requirements

To support accurate historical compensation application, sessions must use explicit session time:

- Add `sessions.session_at timestamptz not null`
- Keep `created_at` as insertion/audit time only
- Compensation lookups must use `session_at`, never `created_at`

### Session creation form updates

Session creation UX and API must capture a session datetime:

- Add required session date/time input on create form
- Convert local user input to UTC before persisting into `session_at`
- Validate `session_at` on API input
- Preserve backward compatibility for existing seeded data via migration backfill

### Write flow for compensation edits

Compensation update must be a single transaction (RPC or SQL transaction):

1. Lock current active compensation version for user.
2. Set current row `effective_to = now()`.
3. Insert new row with `effective_from = now()`, `effective_to = null`.
4. Commit.

`effective_from` is always set by the system at write time (`now()`), not user-provided.

### Read flow for compensation-aware metrics

For a session at time `session_at`, apply compensation version where:

- `effective_from <= session_at`
- and (`effective_to is null` or `session_at < effective_to`)

For fixed weekly/monthly rents and commission caps, aggregate using artist-local period buckets derived from `session_at` + `reporting_timezone`.

### Optional snapshot optimization (recommended)

To improve analytics performance and preserve lineage:

- Add `sessions.compensation_version_id uuid null references artist_compensation_versions(compensation_version_id)`
- At session creation, resolve and store the active compensation version id
- Use this FK in analytics queries where possible

Historical session-to-compensation linkage remains stable because compensation edits are effective from write time onward.

### Migration and rollout notes

- This project has no active production users, so use direct cutover.
- Do not keep `artist_compensation_settings` as a long-term transitional table.
- Move all compensation reads/writes to `artist_compensation_versions` in the same release.
- If legacy dev data exists, run a one-time backfill/reset for local/staging environments, then remove `artist_compensation_settings`.
- Avoid dual-write or compatibility-layer logic.

### Acceptance criteria (Part 2)

- Editing compensation creates a new version row and does not overwrite historical rows.
- At most one active compensation version exists per user.
- Overlapping compensation periods are rejected by DB constraints.
- Reports use `session_at` with artist-local period boundaries.
- Timezone can be edited by user and persists as the canonical reporting timezone.
- Timezone selection only accepts predefined IANA values and rejects invalid timezone input.
- Session creation requires date/time and stores `session_at`.
- Historical sessions continue to calculate using compensation effective at session time.
- Users should be able to delete their account and data from db via the profile edit page from a dedicated section at the bottom of the form. This section should house the delete button, which when clicked will present a popup modal confirming they want to delete as this action is irreversible. We already have a delete confirm popup on the sessions page so this is an opportunity to extract a modal component for the ui library.
