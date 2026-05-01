# Issues

_Last updated: 2026-05-01T12:00:00Z_

## READY

- #127: refactor(actions): split compute-and-upsert-actions into 3-phase pipeline
  scope: lib/actions/compute-and-upsert-actions.ts, lib/actions/action-db.ts
  risk: medium
  depends: none
  brief: #127 (see issue body)

- #128: refactor(sessions): fix inverted dependency — move session UI types to lib/sessions
  scope: lib/sessions/models/index.ts, lib/sessions/fetch-sessions-page.ts, components/dashboard/sessions/utils/session-listing.ts, components/dashboard/sessions/utils/session-formatting.ts
  risk: low
  depends: none
  brief: #128 (see issue body)

## BLOCKED

- #103: test(analytics): E2E tests for monthly history navigation
  depends: #102
  reason: UI under test does not exist until #102 (PR #124) merges

- #129: refactor(sessions): extract compensation hydration out of session fetch
  depends: #128
  reason: both touch lib/sessions/fetch-sessions-page.ts — must not run in parallel; #128 lands first

- #130: refactor: slim API handlers by extracting business logic to domain lib
  depends: #126
  reason: shared constants must be extracted (#126, PR #134) before slimming handlers

- #131: refactor: add barrel exports (index.ts) to lib/clients, lib/sessions, lib/expenses
  depends: #128
  reason: inverted-dep fix must land so exported surface is clean

- #132: refactor: deduplicate pagination logic with shared useInfiniteApiQuery hook
  depends: #131
  reason: barrel exports must exist so hook imports are clean
