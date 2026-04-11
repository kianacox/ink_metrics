# Security Hardening Spec

## 1) Purpose

Define and implement security hardening work identified during a security assessment of `ink_metrics`, with clear, agent-executable tasks and measurable acceptance criteria.

## 2) Goals

- Remove known vulnerable dependencies from production runtime.
- Ensure auth/session protection fails closed in production.
- Harden auth redirect and error handling flows.
- Reduce sensitive data exposure in logs and test defaults.
- Improve supply-chain and repository hygiene.

## 3) Scope

### 3.1 In Scope

- Dependency risk remediation for runtime packages.
- Supabase env guard behavior in proxy/session middleware.
- Auth confirm route query handling and error redirection hardening.
- Redirect target safety constraints for reusable auth helpers.
- Production logging hygiene for profile bootstrap errors.
- E2E credential default hardening in tests and CI.
- Ignore local tool metadata folders likely to contain secrets.
- CI security checks for dependency vulnerabilities and secret scanning.

### 3.2 Out of Scope

- Full SOC2/ISO control implementation.
- Third-party infrastructure hardening outside repository code.
- Re-architecture of authentication provider.

## 4) Findings to Remediate

### 4.1 High

- Upgrade vulnerable `next` version due to DoS advisory:
  - Advisory: `GHSA-q4gf-8mx6-v5v3`
  - Required state: fixed version in use (`16.2.3` or newer).

### 4.2 Medium

- Proxy auth/session guard currently allows bypass behavior when required Supabase public env vars are missing.
- Auth confirm route includes unencoded backend error text directly in redirect query params.
- Auth confirm route accepts and forwards full query strings for safe paths without key-level allowlisting.
- Generic auth helper accepts unrestricted `redirectTo` value, which is a future open-redirect footgun.

### 4.3 Low

- Profile bootstrap failure logging includes raw `userId` and raw backend message.
- Repository and CI define static test password defaults.
- Several dependencies are pinned to `latest`, reducing reproducibility and supply-chain control.
- `.claude/` directory is not ignored and can be accidentally committed.

## 5) Implementation Requirements

### 5.1 Dependency Security

- Update `package.json`:
  - Replace `next: "latest"` with a fixed safe version (`^16.2.3` or stricter, based on team policy).
  - Replace `@supabase/ssr`, `@supabase/supabase-js`, and `tsx` `"latest"` entries with explicit semver ranges.
- Regenerate lockfile via package manager.
- Run audit and confirm no high/critical runtime vulnerabilities remain:
  - `npm audit --omit=dev`

Acceptance criteria:

- `npm audit --omit=dev` reports `0` high/critical issues, or any exceptions are documented with justification and follow-up issue.

### 5.2 Fail-Closed Proxy Behavior in Production

- Update `lib/supabase/proxy.ts` and/or `lib/utils.ts` behavior:
  - In production, missing required Supabase env vars must not silently continue request flow.
  - Return explicit failure response (e.g., `503 Service Unavailable`) or throw startup-visible failure.
  - Keep a safe local-development path if needed (explicitly gated to non-production).

Acceptance criteria:

- Production mode with missing env vars does not permit normal app routing.
- Development mode behavior is explicit and documented.

### 5.3 Auth Confirm Redirect and Error Hardening

- Update `app/auth/confirm/route.ts`:
  - Never place raw backend error message directly into URL query string.
  - Use stable error codes (preferred), or encoded safe text as fallback.
  - If using query params, ensure values are encoded.
- Update `app/auth/error/page.tsx` if needed:
  - Render user-safe, generic copy mapped from known error codes.
  - Do not leak internal backend details.

Acceptance criteria:

- Auth error URLs do not expose raw backend exception text.
- Error page still gives actionable but non-sensitive guidance.

### 5.4 Restrict Post-Login `next` Behavior

- Update `safeNextPath()` in `app/auth/confirm/route.ts`:
  - Validate path as internal relative path.
  - Strip arbitrary query params by default, or allow only an explicit allowlist.
  - Preserve current default fallback behavior to `/dashboard`.

Acceptance criteria:

- Inputs like `/dashboard?next=https://evil.com` do not preserve untrusted query parameters unless explicitly allowlisted.

### 5.5 Constrain `redirectTo` in Auth Helper

- Update `lib/supabase/require-authenticated-user.ts`:
  - Enforce that `redirectTo` must be a safe internal path.
  - Reject/normalize absolute URLs and protocol-like values.
  - Fallback to `/auth/login` for invalid values.

Acceptance criteria:

- Helper cannot redirect to off-site destinations, even if future callers pass unsafe values.

### 5.6 Logging Hygiene

- Update `lib/profiles/bootstrap-user-profile.ts`:
  - Remove raw `userId` from logs, or hash/redact it.
  - Avoid logging raw backend error messages in production.
  - Include non-sensitive correlation context instead (e.g., source + error code).

Acceptance criteria:

- Production logs avoid direct PII identifiers and avoid sensitive backend detail leakage.

### 5.7 Test Credential Hardening

- Update `tests/constants.ts` and `.github/workflows/playwright.yml`:
  - Remove static default test passwords from committed defaults where practical.
  - Read secrets from environment/CI secret store for shared CI.
  - Keep local developer experience by documenting a local-only fallback approach if required.

Acceptance criteria:

- CI no longer relies on hard-coded common password values.
- E2E remains runnable with documented setup.

### 5.8 Repository Hygiene

- Update `.gitignore`:
  - Add `.claude/` (and other local agent/tool state paths if used by team and not intended for version control).

Acceptance criteria:

- Local agent/tool files are not accidentally staged.

### 5.9 CI Security Guardrails

- Add or update GitHub workflow(s) to include:
  - Runtime dependency audit step (`npm audit --omit=dev`).
  - Secret scanning step (e.g., gitleaks, trufflehog, or org-standard scanner).
- Ensure failures block merge (or use required checks policy).

Acceptance criteria:

- PR checks fail on newly introduced high-risk dependency vulnerabilities or detected secrets.

## 6) Required File Targets

- `package.json`
- `package-lock.json`
- `lib/supabase/proxy.ts`
- `lib/utils.ts` (if env guard logic remains centralized)
- `app/auth/confirm/route.ts`
- `app/auth/error/page.tsx` (if error-code mapping UI is introduced)
- `lib/supabase/require-authenticated-user.ts`
- `lib/profiles/bootstrap-user-profile.ts`
- `tests/constants.ts`
- `.github/workflows/playwright.yml`
- `.gitignore`
- `.github/workflows/*` (security workflow updates if separate file is used)

## 7) Testing and Verification Plan

### 7.1 Automated

- `npm run lint`
- `npm run test`
- `npm run test:e2e` (or targeted auth/profile suites if full suite is too slow)
- `npm audit --omit=dev`

### 7.2 Scenario Validation

- Missing Supabase env vars in production mode yields fail-closed behavior.
- Auth confirm with backend failure does not leak raw error internals in URL or UI.
- Auth confirm ignores or strips untrusted query params unless allowlisted.
- Unsafe `redirectTo` values are normalized/fallback to safe internal route.
- Logs from profile bootstrap failures exclude raw user identifiers.

## 8) Delivery Checklist

- [ ] All in-scope code changes implemented.
- [ ] Existing tests updated for new redirect/error behavior.
- [ ] New tests added for fail-closed and redirect safety behavior.
- [ ] CI security checks added and passing.
- [ ] Documentation updated for local E2E secret setup.
- [ ] No secrets or local agent metadata staged for commit.

## 9) Definition of Done

- All acceptance criteria in sections `5.1` through `5.9` are met.
- Security-focused test coverage exists for changed auth and redirect logic.
- Runtime dependency audit is clean or documented with approved exceptions.
- CI enforces dependency and secret scanning checks.
