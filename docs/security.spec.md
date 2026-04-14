# Security Re-Audit Spec (2026-04-14)

## Purpose

Re-audit `ink_metrics` against current repository state and define prioritized remediation work with clear acceptance criteria.

## Audit Method

- Reviewed auth/session handling, API routes, Supabase clients, and middleware/proxy guards.
- Reviewed latest Supabase migrations and storage policies for RLS/data-isolation issues.
- Reviewed CI workflows and repository hygiene controls.
- Ran `npm audit --omit=dev` against current dependency graph.

## Re-Audit Result Summary

- **Status:** Multiple prior findings remain open.
- **New high-risk finding:** `fetch_clients_page` can be abused for cross-tenant reads due to `SECURITY DEFINER` + caller-provided `p_user_id`.
- **Dependency status:** `next` remains vulnerable to advisory `GHSA-q4gf-8mx6-v5v3` (`npm audit --omit=dev` reports 1 high).
- **CI posture:** No dependency-audit or secret-scanning gate is enforced in current workflows.

## Findings and Recommendations

### High

#### H-1: Cross-tenant data exposure via `fetch_clients_page` RPC

- **Risk:** The RPC is `SECURITY DEFINER` and accepts `p_user_id` from the caller, enabling authenticated clients to request another user's data by calling RPC directly.
- **Evidence:** `supabase/migrations/20260411100000_slice3_clients_page_rpc.sql`, `supabase/migrations/20260412100000_slice3_client_last_session_at.sql`, `lib/clients/fetch-clients-page.ts`.
- **Recommendation:**
  - Replace caller-supplied ownership with server-side identity (`auth.uid()`) inside SQL.
  - Remove `p_user_id` parameter from `fetch_clients_page`.
  - Prefer `SECURITY INVOKER` when possible; if `SECURITY DEFINER` is required, enforce explicit `auth.uid()` checks and no user-id inputs.
  - Revoke/replace old function signatures and grants to prevent legacy abuse.
- **Acceptance criteria:**
  - RPC cannot read data for any user except caller identity.
  - Direct RPC invocation with arbitrary user UUID does not return other users' rows.

#### H-2: Vulnerable runtime dependency (`next`)

- **Risk:** DoS vulnerability in current allowed `next` range.
- **Evidence:** `npm audit --omit=dev` reports `GHSA-q4gf-8mx6-v5v3` for `next 16.0.0-beta.0 - 16.2.2`.
- **Recommendation:**
  - Pin `next` to `16.2.3` or newer.
  - Regenerate lockfile and rerun runtime audit.
- **Acceptance criteria:**
  - `npm audit --omit=dev` returns no high/critical runtime vulnerabilities.

### Medium

#### M-1: Fail-open proxy behavior when Supabase env vars are missing

- **Risk:** `updateSession` bypasses auth/session checks when required env vars are absent.
- **Evidence:** `lib/supabase/proxy.ts`, `lib/utils.ts`.
- **Recommendation:**
  - Fail closed in production (startup failure or `503`), with explicit non-production bypass only.
- **Acceptance criteria:**
  - Production mode cannot continue normal routing with missing Supabase env vars.

#### M-2: Auth error details are reflected in URL and UI

- **Risk:** Backend error text is propagated into query params and rendered to users.
- **Evidence:** `app/auth/confirm/route.ts`, `app/auth/error/page.tsx`.
- **Recommendation:**
  - Replace raw messages with stable error codes.
  - Render user-safe copy from code mappings; do not render backend text.
- **Acceptance criteria:**
  - Auth error URLs and pages do not contain raw backend/internal exception text.

#### M-3: `safeNextPath` preserves untrusted query parameters

- **Risk:** Redirect target validation only checks path prefix, then returns full original string including query params.
- **Evidence:** `app/auth/confirm/route.ts`.
- **Recommendation:**
  - Normalize to internal path and allowlist query keys (or strip all by default).
- **Acceptance criteria:**
  - Untrusted query params are dropped unless explicitly allowlisted.

#### M-4: Unrestricted `redirectTo` in auth helper

- **Risk:** Helper accepts arbitrary `redirectTo`; future callsites may accidentally introduce open redirects.
- **Evidence:** `lib/supabase/require-authenticated-user.ts`.
- **Recommendation:**
  - Enforce internal-path-only redirect targets and fallback to `/auth/login`.
- **Acceptance criteria:**
  - Helper never redirects to protocol/absolute/off-site destinations.

#### M-5: API routes return raw RPC/database error messages

- **Risk:** Internal error text is returned to clients, increasing information disclosure.
- **Evidence:** `app/api/sessions/route.ts`, `app/api/clients/route.ts`, `app/api/clients/[clientId]/route.ts`, `app/api/profile/route.ts`, `app/api/profile-setup/route.ts`, `app/api/expenses/route.ts`.
- **Recommendation:**
  - Replace raw backend messages with stable API error codes and sanitized user messages.
  - Log detailed causes server-side only.
- **Acceptance criteria:**
  - Client responses never include raw DB/RPC exception text.

### Low

#### L-1: Logging includes raw `userId` and backend error message

- **Evidence:** `lib/profiles/bootstrap-user-profile.ts`.
- **Recommendation:** Redact/hash identifiers and avoid logging raw backend messages in production.

#### L-2: Static E2E passwords committed in defaults and CI env

- **Evidence:** `tests/constants.ts`, `.github/workflows/playwright.yml`.
- **Recommendation:** Require CI secrets for shared environments; keep local-only documented fallback.

#### L-3: Dependency supply-chain hygiene is weak (`latest` tags)

- **Evidence:** `package.json` (`next`, `@supabase/ssr`, `@supabase/supabase-js`, `tsx`).
- **Recommendation:** Replace `latest` with explicit semver ranges and automate update cadence (Renovate/Dependabot).

#### L-4: Local agent workspace metadata not ignored

- **Evidence:** `.claude/` present in repository but absent from `.gitignore`.
- **Recommendation:** Add `.claude/` (and team-approved local tool state paths) to `.gitignore`.

#### L-5: Missing CI security guardrails

- **Evidence:** `.github/workflows/playwright.yml`, `.github/workflows/unit-tests.yml`.
- **Recommendation:** Add merge-blocking dependency audit and secret scanning workflow checks.

## Prior Audit Delta (What Changed Since Last Spec)

- **Still open:** Dependency vulnerability, fail-open env guard, auth error leakage, redirect hardening gaps, logging/test-secret/repo-hygiene issues, and missing CI security checks.
- **Newly identified:** Cross-tenant RPC exposure in `fetch_clients_page` (`H-1`) introduced/retained in slice 3 SQL.
- **Scope expansion:** Added API error-sanitization requirement across sessions/clients/profile/expenses routes (`M-5`).

## Implementation Plan

### Phase 1 (Immediate: Blocker)

- Fix `H-1` `fetch_clients_page` SQL ownership model and function signature/grants.
- Upgrade `next` and clear runtime audit finding (`H-2`).

### Phase 2 (Short-term)

- Implement production fail-closed env handling (`M-1`).
- Harden auth confirm/error and `next` redirect behavior (`M-2`, `M-3`).
- Constrain generic `redirectTo` helper (`M-4`).
- Sanitize API error responses (`M-5`).

### Phase 3 (Hardening)

- Logging redaction (`L-1`), credential defaults (`L-2`), and `latest` pinning (`L-3`).
- `.gitignore` hygiene (`L-4`).
- CI dependency + secret scanning checks (`L-5`).

## Verification Plan

- `npm run lint`
- `npm run test`
- `npm audit --omit=dev`
- Security regression tests:
  - Direct RPC calls cannot read other users' client data.
  - Missing env vars in production mode fail closed.
  - Auth error flows do not expose internal messages in URL/UI.
  - Unsafe redirect values are normalized.
  - API responses use sanitized error payloads.

## Definition of Done

- All High findings are remediated and verified.
- Medium findings are remediated or tracked with explicit risk acceptance.
- CI contains merge-blocking dependency and secret scanning checks.
- Security tests exist for RPC tenant isolation and auth/redirect hardening paths.
