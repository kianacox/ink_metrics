# Slice 2: Profile Setup

## Overview

Artists should be prompted to set up their profile after sign-up.  
If profile setup is not completed, they should be prompted again on the next login or app visit.

New users must not be able to access the dashboard until profile setup is complete.

## Access and Navigation

- The profile page should be easy to find from the dashboard.
- On mobile/tablet: access via the bottom menu.
- On desktop: access via the left sidebar menu.

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
