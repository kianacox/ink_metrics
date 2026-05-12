# Domain Context — ink_metrics

## Ubiquitous Language


| User term             | Canonical app term                 | Notes                                                                                                                                                         |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chair rent            | Paid to studio                     | Studio deduction — covers both percentage-split and flat-fee compensation models                                                                              |
| Compensation settings | Chair rent settings                | The artist's pay-to-studio arrangement: fixed rent or commission rate                                                                                         |
| Compensation version  | `artist_compensation_versions` row | A time-bounded record of an artist's chair rent arrangement. Multiple versions form a non-overlapping timeline                                                |
| Rollover              | Compensation version rollover      | Closing the current version (`effective_to = tomorrow`) and inserting a new one (`effective_from = tomorrow`). Triggered only when chair rent settings change |
| Effective from        | `effective_from`                   | The date a compensation version becomes active. Changes to chair rent are never applied retroactively — they take effect the day after saving                 |
| Display name          | `display_name`                     | The artist's chosen name shown in the dashboard header. Unrelated to compensation; updated immediately with no version rollover                               |
| In-progress session   | `in_progress = true` session       | A session logged as started but not yet complete. Triggers an In Progress action card after 28 days                                                           |
| Lapsed repeat client  | `lapsed_repeat` action             | A client with 2+ sessions whose most recent session was 56+ days ago. Triggers a Retention action card                                                        |
| New client follow-up  | `new_client` action                | A client with exactly 1 session that was 42+ days ago. Triggers a Follow-up action card                                                                       |
| Revenue at risk       | `revenue_at_risk_minor`            | The estimated revenue value associated with an action card — average session price for lapsed/new, session price for in-progress                              |


## Client Tiers

Clients are classified into three mutually exclusive tiers based on **lifetime session count**. Tiers are computed, never manually assigned.


| Tier          | Condition                |
| ------------- | ------------------------ |
| **One-timer** | 0 or 1 lifetime sessions |
| **Regular**   | 2–4 lifetime sessions    |
| **VIP**       | 5+ lifetime sessions     |


### Rules

- Tier is derived from `lifetimeSessionCount` on `ClientListItem` — no stored field.
- A client with 0 sessions (no appointments logged) is a **One-timer**.
- Tier thresholds are fixed; not user-configurable.
- The former "Returning" badge (binary: `lifetimeSessionCount > 1`) is **replaced** by the tier badge on every client row/card.

### Filter pills

- Four pills: **All** (default), **VIP**, **Regular**, **One-timer**.
- Mutually exclusive — selecting one deselects the others.
- Pills coexist with search, sort, and date-range controls inside the card header block.
- Filtering is **server-side**: `tier` is passed as a query param to `/api/clients`, translated to a session-count range in the `fetch_clients_page` RPC.
- Card title stays "All clients" regardless of active pill.
- Empty state is tier-aware: "No VIP clients yet." / "No regular clients yet." / "No one-time clients yet."

### Test coverage

- Unit tests: tier classification logic (threshold boundaries).
- E2E tests: pill interaction, filtered list results, tier badge display.

---

## Contact and Feedback

Two distinct public-facing surfaces for inbound communication.

### Contact

- **Purpose:** General enquiries — billing, bugs, partnerships, account issues.
- **Audience:** Public — no login required.
- **Destination:** Email delivered to `support@inkmetrics.app` via Resend SDK.
- **Fields:** Name (required), Email (required), Subject (required dropdown), Message (required).
- **Rate limit:** 5 submissions per IP per hour.
- **Success state:** Inline confirmation message replaces the form. No redirect.
- **Route:** `/contact`

### Feedback

- **Purpose:** Product input that informs the development roadmap.
- **Audience:** Authenticated users only. Email auto-populated from session.
- **Destination:** Stored in a `feedback` DB table. No email notification.
- **Fields:** Category (required dropdown: Feature request / Bug report / General feedback), Message (required).
- **Rate limit:** 10 submissions per user per day.
- **Success state:** Inline confirmation message replaces the form. No redirect.
- **Visibility:** Write-only — users cannot view past submissions.
- **Route:** `/feedback`

Both pages are linked from the site footer alongside Privacy Policy and Terms.

---

## Auth Email Templates

Supabase authentication emails are authored in-repo under `email-templates/` and then copied into Supabase as the runtime templates.

### Visual language

- Auth emails use the same **monochrome marketing palette** as the public site.
- Legacy green accents are not part of the current brand language.
- CTA buttons in auth emails follow the site-wide sharp-corner convention.
- Auth-email content cards also use sharp corners (no radius) to match the site-wide style.
- Update scope is styling-only: preserve existing auth template copy, links, and content structure.
- Brand label in auth emails is plain black `inkMetrics` text for now (no accent treatment); this is a temporary stand-in for a future logo.
- Primary auth-email CTA uses a solid black fill with white text.
- Auth-email outer background uses the site-aligned warm off-white tone.

---

## Action Cards

Action cards surface client retention nudges on the insights/actions tab. Each card maps to a `ClientAction` with an `actionType`.

### Priority mapping


| `actionType`    | Display label | Priority | Accent colour     |
| --------------- | ------------- | -------- | ----------------- |
| `lapsed_repeat` | Retention     | HIGH     | destructive (red) |
| `new_client`    | Follow-up     | MEDIUM   | amber             |
| `in_progress`   | In Progress   | MEDIUM   | amber             |


### Visual style

- Matches the marketing landing page action card layout: left accent bar, type label, priority badge, revenue-at-risk, message template box, action buttons.
- **Sharp edges site-wide**: outer card and inner boxes use `rounded-none`; buttons use `rounded-none`.
- Priority pill and dot retain `rounded-full` — pill badges are exempt from the sharp-edges convention.
- Expand/collapse behaviour for the message template is preserved (dashboard is functional, not a marketing demo).
- `weeksSince` field is not surfaced in the card UI.
- Landing page action card is also updated to `rounded-none` to match site-wide styling.

---

## Monthly History

Artists can navigate the analytics dashboard month by month to view historical financial performance.

### Navigation rules

- Default view: current month.
- **Forward** navigation disabled when viewing the current month (ceiling).
- **Backward** navigation disabled when the prior month has no data.
- A month "has data" if it contains at least one session **or** at least one expense.
- Viewed month reflected in the URL as `?month=YYYY-MM`; `?month=current` remains valid for current month.

### Metrics per month

All existing dashboard cards are shown for every month:


| Card                                                     | Scope                                     |
| -------------------------------------------------------- | ----------------------------------------- |
| Take-home summary (gross, paid to studio, expenses, net) | Month-scoped                              |
| Average profit per session                               | Month-scoped                              |
| Client retention rate                                    | Lifetime (all-time), same for every month |
| Expenses by category                                     | Month-scoped                              |


Hours tattooing card is **permanently removed** (session duration tracking was dropped).

### API contract

- Endpoint: `GET /api/dashboard/analytics?month=YYYY-MM`
- Response includes `hasPriorMonthData: boolean` so the client can disable the back button without a preflight request.
- Response shape is intentionally compatible with the future `monthly_analytics_snapshots` table (Slice 8), so the backend can swap data source without breaking the frontend.

### Data source

V1 uses **live computation** — same RPC approach as current dashboard, parameterised by month. No snapshot table required. See `docs/adr/0001-live-computation-first.md`.

### Empty state

`AnalyticsCard` already renders "No data yet for this month." when `hasAnyMetricData()` returns false. No additional empty state work required.

### Test coverage

- Unit tests: month param parsing, `hasPriorMonthData` boundary logic.
- E2E tests: navigating between months, correct data per month, disabled navigation states.

