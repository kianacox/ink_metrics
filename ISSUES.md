# Issues

_Last updated: 2026-04-30T20:35:00Z_

## READY

_(none — both prior READY items now have PRs open awaiting human review)_

## IN REVIEW

- #97: feat(clients): tier filter pills and view wiring
  PR: #123 (https://github.com/kianacox/ink_metrics/pull/123)
  branch: fix/issue-97
  worktree: ./agents/issue-97
  reviewer: APPROVED iter 1

- #102: feat(analytics): month navigation UI and URL sync
  PR: #124 (https://github.com/kianacox/ink_metrics/pull/124)
  branch: fix/issue-102
  worktree: ./agents/issue-102
  reviewer: CHANGES REQUESTED iter 1 (router.replace → router.push), APPROVED iter 2

## BLOCKED

- #98: test(clients): E2E tests for tier filter pills and badges
  depends: #97 (PR #123 merge)
  reason: UI under test does not exist until #97 ships

- #103: test(analytics): E2E tests for monthly history navigation
  depends: #102 (PR #124 merge)
  reason: UI under test does not exist until #102 ships

- #109: feat(marketing): contact form page with email delivery
  depends: PR #121 merge
  reason: PR open and awaiting human review — not available for agent pickup

- #110: feat(marketing): feedback form page with DB storage
  depends: #109
  reason: both modify MarketingFooter — #109 PR (#121) must merge first to avoid conflict
