# Issues

_Last updated: 2026-04-29T00:00:00Z_

## READY

- #71: Add skeleton fallbacks to Suspense boundaries
  scope: app/dashboard/page.tsx, components/shared/site-header.tsx, app/auth/error/page.tsx, components/marketing/marketing-layout.tsx
  risk: low
  depends: none
  brief: #71 (see issue comments)

- #74: Redesign ErrorState component to match site styling
  scope: components/ui/error-state.tsx, components/dashboard/actions/actions-error-state.tsx, components/dashboard/actions/actions-view.tsx
  risk: low
  depends: none
  brief: #74 (see issue comments)

- #76: bug(profile-setup): Next button not disabled when display name is empty on identity step
  scope: components/dashboard/profile-setup/profile-setup-flow.tsx
  risk: low
  depends: none
  brief: #76 (see issue comments)

- #94: feat(clients): tier classification module and unit tests
  scope: lib/clients/tier.ts
  risk: low
  depends: none
  brief: #94 (see issue comments)

- #100: feat(analytics): month boundary utility and unit tests
  scope: lib/dashboard-analytics/month-window.ts
  risk: low
  depends: none
  brief: #100 (see issue comments)

- #109: feat(marketing): contact form page with email delivery
  scope: app/contact/page.tsx, app/api/contact/route.ts, lib/contact/send-contact-email.ts, supabase/migrations/, components/marketing/marketing-layout.tsx
  risk: medium
  depends: none
  brief: #109 (see issue comments)

## BLOCKED

- #95: feat(clients): server-side tier filter (DB migration → API)
  depends: #94
  reason: ClientTier type from #94 required

- #96: feat(clients): replace Returning badge with tier badge on rows and cards
  depends: #94
  reason: getClientTier function from #94 required

- #97: feat(clients): tier filter pills and view wiring
  depends: #95, #96
  reason: API tier param (#95) and badge component (#96) must land first

- #98: test(clients): E2E tests for tier filter pills and badges
  depends: #97
  reason: UI under test does not exist until #97 ships

- #101: feat(analytics): parameterise analytics RPCs by month and update API response
  depends: #100
  reason: parseMonthParam and hasPriorMonthData from #100 required

- #102: feat(analytics): month navigation UI and URL sync
  depends: #101
  reason: API must accept ?month=YYYY-MM and return hasPriorMonthData first

- #103: test(analytics): E2E tests for monthly history navigation
  depends: #102
  reason: UI under test does not exist until #102 ships

- #91: feat(tanstack): wrap all mutation calls with useMutation
  depends: #84, #86
  reason: expenses and sessions must be on useInfiniteQuery before mutations are migrated (PRs #106, #104 pending review)

- #110: feat(marketing): feedback form page with DB storage
  depends: #109
  reason: both modify MarketingFooter — #109 adds Contact link first to avoid merge conflict

## IN REVIEW (ready-for-human)

- #84: feat(tanstack): migrate useExpenses to useInfiniteQuery — PR #106
  reason: CI failures across all checks — investigate infrastructure vs real failure, then human review + manual QA

- #86: feat(tanstack): migrate useSessionsPagination to useInfiniteQuery — PR #104
  reason: CI failures across all checks — investigate infrastructure vs real failure, then human review + manual QA

- #105: feat(actions): restyle action cards to match landing page design — PR #107
  reason: CI failures across all checks — investigate infrastructure vs real failure, then human review
