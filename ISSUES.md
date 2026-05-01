# Issues

_Last updated: 2026-05-01T00:00:00Z_

## READY

- #98: test(clients): E2E tests for tier filter pills and badges
  scope: tests/client-tracking.spec.ts, tests/client-helpers.ts
  risk: low
  depends: none
  brief: #98 (see issue comments)

- #102: feat(analytics): month navigation UI and URL sync
  scope: components/dashboard/analytics/, app/dashboard/page.tsx, lib/dashboard-analytics/
  risk: medium
  depends: none
  brief: #102 (see issue comments)

- #110: feat(marketing): feedback form page with DB storage
  scope: app/feedback/page.tsx, app/api/feedback/route.ts, supabase/migrations/, components/marketing/marketing-layout.tsx
  risk: low
  depends: none
  brief: #110 (see issue comments)

- #125: refactor(sessions): consolidate session models into single source of truth
  scope: lib/sessions/models/
  risk: low
  depends: none
  brief: #125 (see issue body)

- #126: refactor: extract shared pagination constants to lib/constants.ts
  scope: lib/constants.ts, app/api/clients/route.ts, app/api/sessions/route.ts, app/api/expenses/route.ts
  risk: low
  depends: none
  brief: #126 (see issue body)

- #127: refactor(actions): split compute-and-upsert-actions into 3-phase pipeline
  scope: lib/actions/compute-and-upsert-actions.ts, lib/actions/action-db.ts
  risk: medium
  depends: none
  brief: #127 (see issue body)

## BLOCKED

- #103: test(analytics): E2E tests for monthly history navigation
  depends: #102 (PR #124 merge)
  reason: UI under test does not exist until #102 ships

- #128: refactor(sessions): fix inverted dependency — move session UI types to lib/sessions
  depends: #125
  reason: session models must be consolidated before types can be relocated

- #129: refactor(sessions): extract compensation hydration out of session fetch
  depends: #125
  reason: session models must be consolidated before refactoring session fetch

- #130: refactor: slim API handlers by extracting business logic to domain lib
  depends: #126
  reason: shared constants must be extracted before slimming handlers

- #131: refactor: add barrel exports (index.ts) to lib/clients, lib/sessions, lib/expenses
  depends: #125, #128
  reason: session model consolidation and inverted-dep fix must land so exports reflect clean surface

- #132: refactor: deduplicate pagination logic with shared useInfiniteApiQuery hook
  depends: #131
  reason: barrel exports must exist so hook imports are clean
