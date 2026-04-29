# Issues

_Last updated: 2026-04-29T11:30:00Z_

## READY

- #109: feat(marketing): contact form page with email delivery
  scope: app/contact/page.tsx, app/api/contact/route.ts, lib/contact/send-contact-email.ts, supabase/migrations/, components/marketing/marketing-layout.tsx
  risk: medium
  depends: none
  brief: #109 (see issue comments)

## BLOCKED

- #95: feat(clients): server-side tier filter (DB migration → API)
  depends: #94
  reason: #94 PR #111 pending merge

- #96: feat(clients): replace Returning badge with tier badge on rows and cards
  depends: #94
  reason: #94 PR #111 pending merge

- #97: feat(clients): tier filter pills and view wiring
  depends: #95, #96
  reason: API tier param (#95) and badge component (#96) must land first

- #98: test(clients): E2E tests for tier filter pills and badges
  depends: #97
  reason: UI under test does not exist until #97 ships

- #101: feat(analytics): parameterise analytics RPCs by month and update API response
  depends: #100
  reason: #100 PR #114 pending merge

- #102: feat(analytics): month navigation UI and URL sync
  depends: #101
  reason: API must accept ?month=YYYY-MM and return hasPriorMonthData first

- #103: test(analytics): E2E tests for monthly history navigation
  depends: #102
  reason: UI under test does not exist until #102 ships

- #91: feat(tanstack): wrap all mutation calls with useMutation
  depends: #84, #86
  reason: expenses (#84 PR #106) and sessions (#86 PR #104) pending merge

- #110: feat(marketing): feedback form page with DB storage
  depends: #109
  reason: both modify MarketingFooter — #109 adds Contact link first to avoid merge conflict

## IN REVIEW (ready-for-human)

- #71: Add skeleton fallbacks to Suspense boundaries — PR #113
- #74: Redesign ErrorState component to match site styling — PR #112
- #76: bug(profile-setup): Next button not disabled when display name is empty — PR #115
- #84: feat(tanstack): migrate useExpenses to useInfiniteQuery — PR #106
- #86: feat(tanstack): migrate useSessionsPagination to useInfiniteQuery — PR #104
- #94: feat(clients): tier classification module and unit tests — PR #111
- #100: feat(analytics): month boundary utility and unit tests — PR #114
- #105: feat(actions): restyle action cards to match landing page design — PR #107
