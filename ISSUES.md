# Issues

_Last updated: 2026-05-02T09:00:00Z_

## READY

_None — all four READY items shipped to PR this run. Re-evaluate BLOCKED items once their dependencies merge._

## BLOCKED

- #129: refactor(sessions): extract compensation hydration out of session fetch
  depends: #128 (PR #138)
  reason: both touch lib/sessions/fetch-sessions-page.ts — must not run in parallel; #128 lands first

- #131: refactor: add barrel exports (index.ts) to lib/clients, lib/sessions, lib/expenses
  depends: #128 (PR #138)
  reason: inverted-dep fix must land so exported surface is clean

- #132: refactor: deduplicate pagination logic with shared useInfiniteApiQuery hook
  depends: #131
  reason: barrel exports must exist so hook imports are clean

## In flight (PR open, awaiting merge)

- #127 → PR #137 (refactor(actions): split compute-and-upsert-actions into 3-phase pipeline)
- #128 → PR #138 (refactor(sessions): move SessionRow and SessionSortField to lib/sessions/models)
- #130 → PR #139 (refactor: extract API handler business logic to domain lib)
- #103 → PR #140 (test(analytics): E2E tests for monthly history navigation)
