# Issues

_Last updated: 2026-04-30T17:30:00Z_

## READY

- #109: feat(marketing): contact form page with email delivery
  scope: app/contact/page.tsx, app/api/contact/route.ts, lib/contact/send-contact-email.ts, supabase/migrations/, components/marketing/marketing-layout.tsx
  risk: medium
  depends: none
  brief: #109 (see issue comments)

- #116: bug: profile display name changes trigger compensation version rollover instead of immediate update
  scope: app/api/profile/route.ts, supabase/migrations/, components/dashboard/profile/profile-edit-form.tsx, components/dashboard/profile/hooks/use-save-profile.ts, lib/profiles/fetch-profile-settings.ts
  risk: medium
  depends: none
  brief: #116 (see issue comments)

- #101: feat(analytics): parameterise analytics RPCs by month and update API response
  scope: supabase/migrations/, app/api/dashboard/analytics/route.ts, lib/analytics/
  risk: medium
  depends: none
  brief: #101 (see issue comments)

- #95: feat(clients): server-side tier filter (DB migration → API)
  scope: supabase/migrations/, app/api/clients/route.ts, lib/clients/fetch-clients-page.ts
  risk: low
  depends: none
  brief: #95 (see issue comments)

- #96: feat(clients): replace Returning badge with tier badge on rows and cards
  scope: components/dashboard/clients/clients-table.tsx, components/dashboard/clients/clients-cards.tsx, lib/clients/tier.ts
  risk: low
  depends: none
  brief: #96 (see issue comments)

- #91: feat(tanstack): wrap all mutation calls with useMutation
  scope: components/dashboard/sessions/, components/dashboard/expenses/, components/dashboard/clients/
  risk: medium
  depends: none
  brief: #91 (see issue comments)

## BLOCKED

- #110: feat(marketing): feedback form page with DB storage
  depends: #109
  reason: both modify MarketingFooter — #109 adds Contact link first to avoid merge conflict

- #102: feat(analytics): month navigation UI and URL sync
  depends: #101
  reason: API must accept ?month=YYYY-MM and return hasPriorMonthData first

- #103: test(analytics): E2E tests for monthly history navigation
  depends: #102
  reason: UI under test does not exist until #102 ships

- #97: feat(clients): tier filter pills and view wiring
  depends: #95, #96
  reason: API tier param (#95) and badge component (#96) must land first

- #98: test(clients): E2E tests for tier filter pills and badges
  depends: #97
  reason: UI under test does not exist until #97 ships
