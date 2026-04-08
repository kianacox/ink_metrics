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
- Add a new 1:1 table for compensation settings.
- Do not store compensation config as JSON.

### `profiles` updates

Add fields:

- `is_profile_complete boolean not null default false`
- `profile_completed_at timestamptz null`
- `display_name text null`

Rules:

- `default_currency` is set during initial profile setup and is not editable afterward.
- `is_profile_complete` is set to `true` only when profile inputs are valid and compensation settings are valid.

### New table: `artist_compensation_settings`

One row per user (`user_id` is both PK and FK to `auth.users(id)` with `on delete cascade`).

Fields:

- `user_id uuid primary key`
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

### Storage conventions

- Store money in minor units (`*_minor`) for exact arithmetic.
- Store percentages in basis points (`*_bps`) for precision and deterministic calculations.

### Upsert and writes

- Profile setup save should use a single transaction-style flow:
  1. Upsert `artist_compensation_settings` by `user_id`.
  2. Update `profiles` with name and completion fields.
  3. Set `is_profile_complete = true` and `profile_completed_at = now()` only when all required data is valid.
- Use `INSERT ... ON CONFLICT (user_id) DO UPDATE` semantics to avoid race conditions.

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

### Edit Profile

Users should be able to edit their profile via a dedicated profile page, accesible from the bottom nav menu on mobile and the left menu on desktop.
Users can edit:

- their display name
- all compensation settings

For this section we have two options:

- introduce compensation versioning for fully accurate records over time (i.e an artist starts using the application employed at one studio, then moves to a different one with a different chair rent. In their records, sessions done at the original studio should apply the compensation calculations for that studio)
- apply current compensation settings to all historical settings.

I would prefer the first option, as it is a better, more accurate experience for the user. But I am unsure how to design the database to handle this.
