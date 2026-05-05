# Issues

_Last updated: 2026-05-05T00:00:00Z_

## READY

- #129: refactor(sessions): extract compensation hydration out of session fetch
  scope: lib/sessions/
  risk: medium
  depends: none
  brief: #129 (see issue comments)

- #130: refactor: slim API handlers by extracting business logic to domain lib
  scope: app/api/, lib/
  risk: medium
  depends: none
  brief: #130 (see issue comments)

- #131: refactor: add barrel exports (index.ts) to lib/clients, lib/sessions, lib/expenses
  scope: lib/clients/, lib/sessions/, lib/expenses/
  risk: low
  depends: none
  brief: #131 (see issue comments)

- #144: feat(profiles): add is_founding_user to profiles table with backfill migration
  scope: supabase/migrations/
  risk: low
  depends: none
  brief: #144 (see issue comments)

- #145: feat(marketing): FoundingCounter component — progress bar + label
  scope: components/marketing/
  risk: low
  depends: none
  brief: #145 (see issue comments)

## BLOCKED

- #132: refactor: deduplicate pagination logic with shared useInfiniteApiQuery hook
  depends: #131
  reason: barrel exports must exist so hook imports are clean

- #147: feat(profiles): founding user signup logic in ensureUserProfile
  depends: #144
  reason: column must exist before application logic can reference it

- #148: feat(marketing): getFoundingCount query utility with 60s cache
  depends: #144
  reason: column must exist before count query is meaningful

- #149: feat(marketing): update pricing page — founding/standard card states + counter
  depends: #145, #148
  reason: requires FoundingCounter component and getFoundingCount utility

- #150: feat(marketing): embed FoundingCounter on landing page — hero + final CTA
  depends: #145, #148
  reason: requires FoundingCounter component and getFoundingCount utility

- #151: docs(context): migrate terms into domain CONTEXT.md files, prune root
  depends: #146
  reason: HITL — structure must be approved by human before migration begins
