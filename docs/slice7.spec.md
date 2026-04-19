# Slice 7 Spec: Client Actions Dashboard

## 1) Purpose

Pivot the dashboard from a passive financial snapshot into an active revenue driver. Surface prioritised, actionable prompts that tell artists exactly which clients to contact, why, and what to say — without changing their booking workflow.

## 2) Goals

- Add an Actions tab to the dashboard that surfaces time-sensitive client engagement signals.
- Persist action records so dismissal state survives page reloads.
- Re-trigger actions after the signal threshold passes again post-dismissal.
- Show revenue at risk per action so artists prioritise by financial impact.
- Provide copy-paste message templates per action type.
- Preserve the existing analytics view as an unchanged Insights tab.

## 3) Scope

### 3.1 In Scope

- Two-tab dashboard layout: **Actions** (default) and **Insights**.
- Insights tab: existing analytics cards moved as-is, zero functional change.
- Three action types:
  - Lapsed repeat client
  - New client re-engagement
  - In-progress tattoo follow-up
- `in_progress` boolean column on `sessions` table.
- `client_actions` persistence table with dismissal and re-trigger logic.
- Page-load action upsert: compute signals, upsert records, return active list.
- Revenue at risk per action card, ordered descending.
- Copy-paste message templates per action type.
- Dismiss button per action (permanent until re-trigger threshold).
- Empty state for zero active actions.
- Unit, integration, and e2e coverage.

### 3.2 Out of Scope

- AI-generated messages.
- Snooze / remind-me-later functionality.
- Background cron for action generation.
- New insight card types in the Insights tab.
- Push notifications or email alerts.
- Action analytics or engagement tracking.

## 4) Data Model

### 4.1 sessions.in_progress

```sql
ALTER TABLE sessions ADD COLUMN in_progress boolean NOT NULL DEFAULT false;
```

- Set by artist via checkbox on the session form.
- Per-session flag — not per-client.
- Does not auto-clear; the action auto-resolves when a new session is logged for the same client.

### 4.2 client_actions table

```sql
CREATE TABLE client_actions (
  action_id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  action_type      text        NOT NULL,
  session_id       uuid        REFERENCES sessions(session_id) ON DELETE CASCADE,
  revenue_at_risk_minor integer,
  dismissed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_actions_type_check
    CHECK (action_type IN ('lapsed_repeat', 'new_client', 'in_progress')),
  UNIQUE (user_id, client_id, action_type)
);

ALTER TABLE client_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own actions"
  ON client_actions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX client_actions_user_active_idx
  ON client_actions (user_id, dismissed_at)
  WHERE dismissed_at IS NULL;
```

`session_id` is populated only for `in_progress` actions. For lapsed and new-client types it is NULL.

## 5) Action Type Definitions

### 5.1 Lapsed Repeat Client (`lapsed_repeat`)

**Signal:** Client has 2 or more sessions with this artist AND the most recent session was more than 8 weeks ago.

**Threshold:** 8 weeks (56 days).

**Revenue at risk:** `AVG(sessions.price)` across all sessions for that client, in minor units.

**Re-trigger:** Action is suppressed while `dismissed_at IS NOT NULL AND now() - dismissed_at < 56 days`. Once 56 days pass after dismissal, the action is re-activated if the signal still holds.

### 5.2 New Client Re-engagement (`new_client`)

**Signal:** Client has exactly 1 session with this artist AND that session was more than 6 weeks ago.

**Threshold:** 6 weeks (42 days).

**Revenue at risk:** `sessions.price` of that single session, in minor units.

**Re-trigger:** Same logic — suppressed for 42 days post-dismissal, then re-activates if signal still holds.

### 5.3 In-Progress Follow-up (`in_progress`)

**Signal:** Client's most recent session has `in_progress = true` AND that session was more than 4 weeks ago AND no newer session exists for this client.

**Threshold:** 4 weeks (28 days).

**Revenue at risk:** `sessions.price` of the in-progress session, in minor units.

**session_id:** Set to the triggering session's ID.

**Auto-resolve:** When a new session is logged for this client, this action is automatically deleted (ON DELETE CASCADE via session_id is insufficient here — see §6.2 for explicit resolution logic).

**Re-trigger:** Same pattern — suppressed 28 days post-dismissal, re-activates if signal still holds.

## 6) Action Generation Logic

### 6.1 Page-load upsert flow

On every Actions tab load, the API endpoint:

1. Computes all three signal sets for the authenticated user.
2. For each triggered signal, upserts into `client_actions`:
   - **Insert** if no record exists.
   - **Re-activate** (set `dismissed_at = NULL`, update `revenue_at_risk_minor`) if record exists and `now() - dismissed_at >= threshold`.
   - **Skip** if record exists, dismissed, and within suppression window.
   - **Skip** if record exists and already active (`dismissed_at IS NULL`).
3. Deletes stale `in_progress` actions for clients who now have a newer session (auto-resolve).
4. Returns all records where `dismissed_at IS NULL`, ordered by `revenue_at_risk_minor DESC`.

### 6.2 In-progress auto-resolve

After computing in-progress signals, delete any existing `in_progress` action for clients whose most recent session is no longer `in_progress = true` (i.e. a newer session was logged):

```sql
DELETE FROM client_actions
WHERE user_id = $user_id
  AND action_type = 'in_progress'
  AND client_id NOT IN (<current in-progress signal client ids>);
```

### 6.3 Signal queries (reference shapes)

**Lapsed repeat signal:**
```sql
SELECT
  c.client_id,
  ROUND(AVG(s.price))::integer AS revenue_at_risk_minor
FROM clients c
JOIN sessions s ON s.client_id = c.client_id AND s.user_id = $user_id
WHERE c.user_id = $user_id
GROUP BY c.client_id
HAVING
  COUNT(s.session_id) >= 2
  AND MAX(s.session_at) < now() - INTERVAL '56 days';
```

**New client signal:**
```sql
SELECT
  c.client_id,
  MAX(s.price)::integer AS revenue_at_risk_minor
FROM clients c
JOIN sessions s ON s.client_id = c.client_id AND s.user_id = $user_id
WHERE c.user_id = $user_id
GROUP BY c.client_id
HAVING
  COUNT(s.session_id) = 1
  AND MAX(s.session_at) < now() - INTERVAL '42 days';
```

**In-progress signal:**
```sql
SELECT DISTINCT ON (s.client_id)
  s.client_id,
  s.session_id,
  s.price AS revenue_at_risk_minor
FROM sessions s
WHERE s.user_id = $user_id
ORDER BY s.client_id, s.session_at DESC
-- filtered in app layer: keep rows where in_progress = true AND session_at < now() - 28 days
```

## 7) API Requirements

### 7.1 GET /api/dashboard/actions

Returns active actions for authenticated user.

**Triggers:** Page-load upsert flow (§6.1) before reading.

**Response contract:**

```ts
{
  actions: Array<{
    actionId: string;
    clientId: string;
    clientName: string;
    actionType: 'lapsed_repeat' | 'new_client' | 'in_progress';
    weeksSince: number;
    revenueAtRiskMinor: number;
    messageTemplate: string;
  }>;
}
```

**Auth:** Requires authenticated user. Unauthenticated → 401.

**Error codes:** `ACTIONS_FETCH_FAILED`, `ACTIONS_UPSERT_FAILED`.

### 7.2 POST /api/dashboard/actions/[actionId]/dismiss

Dismisses a single action.

**Body:** none.

**Behaviour:** Sets `dismissed_at = now()` on the record. Returns 200 on success.

**Auth:** Must verify `action.user_id = auth user`. Foreign ownership → 403.

**Error codes:** `ACTION_NOT_FOUND`, `ACTION_DISMISS_FAILED`.

## 8) Message Templates

Templates are resolved server-side and included in the GET response. Artist copies and pastes into their preferred channel (Instagram DM, WhatsApp, etc.).

### 8.1 Lapsed repeat client

```
Hey {{client_name}}! It's been a while — hope you're well.
I've got some availability coming up if you've been thinking about
your next piece. Let me know if you'd like to get something booked in!
```

### 8.2 New client re-engagement

```
Hey {{client_name}}! Really enjoyed tattooing you — hope you're
loving the piece. If you've been thinking about adding to your
collection, I'd love to work with you again. Feel free to reach out!
```

### 8.3 In-progress follow-up

```
Hey {{client_name}}! Just checking in on your piece — hope it's
healing well. Whenever you're ready to book the next session, just
give me a shout and we'll get it sorted.
```

Substitute `{{client_name}}` with `clients.name` at response serialisation time.

## 9) Frontend Requirements

### 9.1 Tab layout

- Existing "Quick actions" section (Add session) stays pinned above the tab bar — visible on all tabs.
- Tab bar sits below quick actions. Labels: **Actions** | **Insights**.
- Default active tab: **Actions**.
- Tab state: URL param `?tab=actions` / `?tab=insights` via `useSearchParams` + `router.replace` for deep-linking and back-button support.
- Insights tab renders existing `<DashboardAnalyticsView />` component unchanged.

### 9.2 Actions tab

- Section greeting above cards: `"Hey [display_name], here's who needs a message:"`. Falls back to `"Hey there"` if `display_name` is null. Sourced from server component prop — no extra fetch.
- Fetch `GET /api/dashboard/actions` on mount.
- Single-column card list, `max-w-2xl`, centred on wide screens.
- Loading state: 2–3 shaped skeleton cards (`animate-pulse`) mirroring real card zones.
- Empty state: checkmark/sparkle icon + heading `"All caught up"` + subtext `"No actions right now — your client list looks healthy."`.
- Error state: `RefreshCw` icon + heading `"Something went wrong"` + subtext `"Couldn't load actions. Try refreshing."` + "Try again" button that re-triggers the fetch.
- Render one card per client result, ordered by `revenueAtRiskMinor DESC` (server-sorted).

### 9.3 Action card

Two-zone shadcn `Card`:

**Top zone (always visible):**
- Client name as card title (bold).
- Friendly nudge sentence (see copy below).
- Revenue at risk: `£X at risk` in `text-sm text-muted-foreground`.

**Footer row:**
- Left: "View message" / "Hide message" toggle (`ghost` variant) — label swaps when template panel is open.
- Right: "Dismiss" button (`ghost` variant).

**Expanded template panel:**
- Inline accordion, animated via Framer Motion `AnimatePresence`.
- Message text displayed first.
- "Copy message" button (`outline` variant) below the text.
- On copy: button shows "Copied!" for 2 s then reverts. No toast.

**Friendly nudge copy per action type:**

| Type | Copy |
|------|------|
| `lapsed_repeat` | "It's been {{weeks}} weeks since their last session — worth a check-in." |
| `new_client` | "{{weeks}} weeks since their first visit — a quick message could bring them back." |
| `in_progress` | "Their piece is still in progress and it's been {{weeks}} weeks — time to follow up." |

### 9.4 Session form — in-progress checkbox

- Add checkbox to existing session form: **"Tattoo still in progress"**
- Defaults to unchecked.
- Persists `in_progress` boolean to `sessions` table on create and edit.

### 9.5 Dismiss interaction

- Clicking "Dismiss" calls `POST /api/dashboard/actions/[actionId]/dismiss`.
- On success: card fades out and collapses via Framer Motion `AnimatePresence` (`exit={{ opacity: 0, height: 0 }}`).
- On error: inline toast (`fixed right-4 top-4`), card remains.
- No confirmation modal required.

## 10) Validation and Edge Cases

- Client with no `contact_info`: still show action card — artist knows how to reach them.
- `revenue_at_risk_minor = 0` or NULL: display as `£0`, still show card.
- Client deleted: `ON DELETE CASCADE` removes action automatically.
- Session deleted mid-flow: re-compute on next load; stale action is cleaned up.
- All actions dismissed: render empty state.
- User has no clients yet: zero signals computed, empty state shown.
- `in_progress` action dismissed then new session logged: action deleted via auto-resolve regardless of dismissal state.

## 11) Testing Requirements

### 11.1 Unit tests

Cover:

- Signal computation for each action type (standard and edge cases).
- Re-trigger logic: within suppression window → no re-activate; past window → re-activate.
- In-progress auto-resolve: client with new session removed from signal set.
- Revenue at risk calculation: `AVG(price)` for repeat, single price for new/in-progress.
- Template substitution: `{{client_name}}` replaced correctly.
- Zero-state branches: no clients, no qualifying sessions.

### 11.2 Integration/API tests

Cover:

- `GET /api/dashboard/actions` auth guard → 401 unauthenticated.
- Stable response shape and error codes.
- Upsert idempotency: calling twice does not duplicate actions.
- Dismissed action within suppression window: not returned.
- Dismissed action past suppression window: re-activated and returned.
- `POST /api/dashboard/actions/[actionId]/dismiss` sets `dismissed_at`.
- Foreign action dismiss attempt → 403.

### 11.3 E2E tests

Cover:

- Actions tab is default on `/dashboard`.
- Empty state renders when no signals present.
- Lapsed repeat client action card appears with correct weeks and revenue.
- New client re-engagement card appears correctly.
- In-progress card appears after session logged with checkbox checked.
- In-progress card disappears after new session logged for same client.
- Dismiss removes card from list without page reload.
- Dismissed action does not reappear on same-session reload.
- Insights tab renders existing analytics cards unchanged.
- Session form has in-progress checkbox; value persists on save.

## 12) PR Delivery Plan

### PR 1: Schema and foundation

- Migration: `in_progress` column on `sessions`.
- Migration: `client_actions` table, RLS, indexes.
- Domain types for action records.
- Signal query utilities (unit-tested).
- Template resolver utility.

### PR 2: API layer

- `GET /api/dashboard/actions` with upsert flow.
- `POST /api/dashboard/actions/[actionId]/dismiss`.
- Auth guards, error codes, response serialisation.
- Integration tests for both endpoints.

### PR 3: Session form checkbox

- Add `in_progress` checkbox to session create and edit forms.
- Wire to API (existing session create/update routes).
- E2e coverage for checkbox persist.

### PR 4: Actions tab UI

#### Layout

- Existing "Quick actions" section (Add session) stays pinned above the tab bar on all tabs.
- Two-tab bar sits below quick actions: **Actions** | **Insights**.
- Tab state driven by URL param `?tab=actions` (default) / `?tab=insights` via `useSearchParams` + `router.replace`.
- Insights tab renders existing `<DashboardAnalyticsView />` unchanged.
- Actions tab content is a single-column list, capped at `max-w-2xl`, centred on wide screens.

#### Section greeting

- Above the card list: `"Hey [display_name], here's who needs a message:"`.
- `display_name` passed as prop from the server component (already fetched via `bootstrapUserProfile`). Falls back to `"there"` if null.

#### Action card anatomy

Each card is a shadcn `Card` with two zones:

**Top zone (always visible):**
- Card title: client name (bold).
- Friendly nudge sentence (see copy below).
- Subtle revenue line: `£X at risk` in `text-sm text-muted-foreground`.

**Footer row:**
- Left: "View message" / "Hide message" toggle button (`ghost` variant) — label swaps on open.
- Right: "Dismiss" button (`ghost` variant).

**Expanded template panel (inline accordion):**
- Slides open below the top zone using Framer Motion `AnimatePresence`.
- Message text displayed first.
- "Copy message" button (`outline` variant) below the text.
- On copy: button label changes to "Copied!" for 2 s then reverts — no toast needed.

#### Friendly nudge copy per action type

| Type | Copy |
|------|------|
| `lapsed_repeat` | "It's been {{weeks}} weeks since their last session — worth a check-in." |
| `new_client` | "{{weeks}} weeks since their first visit — a quick message could bring them back." |
| `in_progress` | "Their piece is still in progress and it's been {{weeks}} weeks — time to follow up." |

#### Dismiss interaction

- Clicking "Dismiss" calls `POST /api/dashboard/actions/[actionId]/dismiss`.
- On success: card fades out and collapses via Framer Motion `AnimatePresence` (`exit={{ opacity: 0, height: 0 }}`).
- On error: inline toast (existing toast pattern — `fixed right-4 top-4`), card remains.
- No confirmation modal — action is reversible via re-trigger threshold.

#### Loading state

- 2–3 shaped skeleton cards using `animate-pulse`.
- Each skeleton mirrors the real card zones: title bar, body lines, footer row.

#### Empty state

- Icon (checkmark or sparkle) + heading `"All caught up"` + subtext `"No actions right now — your client list looks healthy."`.
- Centred within the content area.

#### Error state

- `RefreshCw` icon + heading `"Something went wrong"` + subtext `"Couldn't load actions. Try refreshing."` + `outline` variant "Try again" button that re-triggers the fetch.

#### Dependencies

- Install `framer-motion` for card list enter/exit animations.
- `display_name` sourced from existing server-side profile fetch — no new API call.

#### Deliverables

- Two-tab layout component wrapping existing dashboard.
- `<ActionCard />` component with template accordion and dismiss.
- Skeleton, empty, and error state components.
- E2e coverage for: tab switching, card render, template expand/copy, dismiss animation, empty state.

### PR 5: Hardening

- Cross-browser copy-to-clipboard fallback.
- Accessibility: tab keyboard navigation, card semantics.
- Final e2e pass covering full Actions + Insights regression.

## 13) Acceptance Criteria

- `/dashboard` defaults to Actions tab.
- Actions tab surfaces correct cards for all three signal types.
- Each card shows client name, action label, weeks since, revenue at risk, message template, and dismiss button.
- Dismiss removes card immediately; it does not reappear within the suppression window.
- Action re-triggers after the threshold period passes post-dismissal.
- In-progress action auto-resolves when new session logged for that client.
- Session form has in-progress checkbox that persists correctly.
- Insights tab renders existing analytics cards with no regression.
- All signal queries are covered by unit tests.
- Full e2e suite passes.
