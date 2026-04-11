# Contributing Guidelines

This project values small, reliable, test-backed changes.

## Core Rules

- Always add or update tests for behavior changes.
- Keep changes scoped to the requested feature or fix.
- Do not remove or alter unrelated behavior.
- Prefer meaningful names and avoid magic numbers.
- Keep functions and components focused on one responsibility.
- Extract duplicate logic instead of repeating code.

## Product Alignment

Before implementing, check relevant specs in `docs/`:

- `docs/ink_metrics.spec.md`
- `docs/slice1.spec.md`
- `docs/slice2.spec.md`
- `docs/slice3.spec.md`

If code and spec disagree, follow product intent and call out the mismatch in PR notes.

## Code Standards

- Use TypeScript strictness and keep types explicit where it improves clarity.
- Use functional React components and reusable hooks for shared behavior.
- Keep state close to where it is used.
- Favor composition over large monolithic components.
- Keep comments focused on why, not what.

## Testing Requirements

Minimum expectation for each change:

1. Unit tests for pure/domain logic updates.
2. E2E tests for user journeys or structure changes.
3. Regression coverage for bug fixes.

Recommended commands:

- `npm run lint`
- `npm test`
- `npm run test:e2e`
- `npx tsc --noEmit`

## Database and API Changes

- Preserve auth ownership checks on reads/writes.
- Keep payload validation explicit and defensive.
- Avoid breaking API contracts without coordinated updates.
- Add migration-safe changes and verify local reset works.

## Pull Request Quality

Each PR should include:

- clear intent and scope
- test evidence
- risk notes for destructive/data-impacting changes
- follow-up tasks if any scope is intentionally deferred

## What Not To Do

- Do not commit secrets or `.env` values.
- Do not introduce broad refactors unrelated to the task.
- Do not skip tests when behavior changes.
- Do not invent requirements outside accepted scope.
