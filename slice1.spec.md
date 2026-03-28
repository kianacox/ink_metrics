# Slice 1: Auth, design tokens, and session logger

## Purpose

Ship:

1. A **marketing landing page** with copy **derived from** `ink_metrics.spec.md`.
2. **Auth-aware routing**: after login, users land on **`/dashboard`** (not the previous default such as `/protected`, unless you explicitly unify those routes).
3. A **minimal design system** using the palette below (greens symbolise wealth).
4. A **session logging** entry point on the dashboard: “Add session” opens a form (modal or dialog), submits to **Supabase**, touching **`Sessions`** and **`Clients`** when new client data is provided, with **success or failure** feedback.

## Out of scope (this slice)

- Full analytics, charts, or reporting beyond placeholder dashboard content.
- Email templates or auth provider configuration (assume existing Supabase auth works).

## Dependencies

| Artifact | How an implementer should use it |
| -------- | -------------------------------- |
| `ink_metrics.spec.md` | Primary reference for **tone, problem, and solution** when writing landing copy; do not contradict it. |
| Repo Supabase + Next.js auth | Login/sign-up flows already exist; extend routing and protected areas as needed. |

---

## Design system — colour palette

Expose these as **semantic tokens** (e.g. CSS variables: `--color-accent`, `--color-surface`, etc.) and apply across layout, chrome, and key CTAs.

| Role | Hex | Semantic intent |
| ---- | --- | ---------------- |
| Primary / accent | `#2EC70F` | Wealth, positive action, primary CTAs |
| Secondary / cool | `#4A7D96` | Secondary UI, headings, muted structure |
| Mid green | `#2DAE58` | Hover states, secondary emphasis, links |
| Light mint | `#C7FABD` | Soft fills, borders, highlights |
| Page background | `#F7FEF6` | Near-white with green tint (if the team’s notes used `#F7EF6`, treat that as a typo and use this 6-digit value) |

---

## Routes

| Route | Access | Content |
| ----- | ------ | ------- |
| `/` (or existing marketing root) | Public | Marketing landing page (copy from `ink_metrics.spec.md`). |
| `/dashboard` | Authenticated | Dashboard with **placeholder** main content; must include **Add session**. |
| Existing `/auth/*` | As today | Sign-in / sign-up; **post-login redirect** should target `/dashboard` for this slice. |

---

## User flows

### Flow A — Anonymous visitor

1. Open landing page → sees marketing content.
2. Can navigate to sign up / sign in as today.

### Flow B — Authenticated user

1. Complete login → redirect to **`/dashboard`**.
2. See dashboard (placeholders OK).
3. Click **Add session** → **popup** (modal/dialog) opens.
4. Fill form → submit → see **success** or **failure** notification (toast, inline alert, or banner—pick one pattern and use it consistently).
5. On success, close or reset modal per UX preference; data must appear in Supabase as specified below.

---

## “Add session” form (modal)

**Trigger:** Button labelled **Add session** on `/dashboard`.

**Fields:**

| Field | Required | Maps to / behaviour |
| ----- | -------- | ------------------- |
| Client name | Yes | `Clients` (create or link row as per schema). |
| Client contact | No | `Clients` when creating/updating client. |
| Session length | Yes | `Sessions.session_duration` (`numeric`, e.g. minutes—match your DB convention). |
| Profit | Yes | `Sessions` (revenue/profit; match DB column naming). |

**Persistence rules (intent):**

- Persist a **session** row in **`Sessions`**.
- If **new client** information is entered (or no existing client matches—define matching rule in implementation, e.g. by name or contact), create or update **`Clients`** and associate the session to that client **per your schema** (foreign key, join table, etc.).
- Schema lives in Supabase; the app expects `sessions.session_duration` (numeric) alongside `price`, `client_id`, and `user_id`.

---

## Acceptance criteria (checklist)

- [ ] Landing page exists and reads as marketing; aligned with `ink_metrics.spec.md`.
- [ ] Palette applied via shared tokens (not hard-coded one-offs scattered without tokens).
- [ ] Logged-in user hitting post-login flow lands on **`/dashboard`**.
- [ ] `/dashboard` shows placeholder content and an **Add session** button.
- [ ] Modal includes all four fields; optional field behaves as optional.
- [ ] Submit writes to Supabase (`Sessions` with `session_duration` and `price`; `Clients` when new client data applies).
- [ ] User always gets a clear **success** or **failure** message after submit.

---

## Notes for implementers

- Prefer **one** notification pattern for submit feedback.
- Keep **RLS policies** in mind: the anon/publishable client must be allowed to insert/update only what this flow needs.
- If `protected` route is legacy, either **redirect** `/protected` → `/dashboard` or **replace** references in auth callbacks to avoid two “home” destinations.
