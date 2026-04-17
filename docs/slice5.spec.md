# Slice 5 Spec: Analytics Dashboard

## 1) Purpose

Deliver a mobile-first analytics dashboard that gives tattoo artists a reliable monthly business snapshot without changing their booking workflow.

The dashboard must show current calendar month metrics with deterministic formulas, timezone-correct boundaries, and compensation-aware calculations.

## 2) Goals

- Replace dashboard placeholder content with production analytics cards.
- Provide accurate take-home metrics after studio deductions and expenses.
- Add retention and efficiency metrics that can be trusted for business decisions.
- Keep calculations historically correct when compensation versions change over time.
- Ship each dashboard addition as a separate PR after a shared foundation PR.

## 3) Scope

### 3.1 In Scope

- Dashboard title showing `{MonthName} stats` (for example, `April stats`).
- One analytics card per stat:
  - Take-home summary card (`gross`, `paid to studio`, `total expenses`, `net`).
  - Client retention rate card.
  - Average profit per session card.
  - Hours spent tattooing card.
  - Expenses by category card with chart and total.
- Aggregations over current month using `profiles.reporting_timezone`.
- Unit, integration, and e2e coverage for formulas and edge cases.
- Performance-conscious query design and supporting indexes.

### 3.2 Out of Scope

- Cross-month comparisons and trend lines.
- Custom date-range analytics UI.
- Forecasting and predictive insights.
- Slice 6 report export behavior.

## 4) Decisions and Data Contracts

### 4.1 Time Window Contract (required)

- Source of truth timezone: `profiles.reporting_timezone`.
- Window type: current local calendar month.
- Interval semantics: half-open `[month_start_local, month_end_local)`.
- Convert local boundaries to UTC before querying `sessions.session_at`.
- Use the same month window for all cards in this slice.

### 4.2 Money Contract (required)

- Keep all server-side calculations in integer minor units.
- Read from:
  - `sessions.price` (stored in minor units),
  - `expenses.amount_minor`,
  - compensation `*_minor` fields.
- Round only for display formatting, never during intermediate computation.

### 4.3 Session Contract (required)

- Revenue source: `sessions.price`.
- Duration source: `sessions.session_duration` in minutes.
- Session timestamp source: `sessions.session_at` (not `created_at`).
- Compensation resolution:
  - Primary: `sessions.compensation_version_id`.
  - Fallback for legacy nulls: resolve by `artist_compensation_versions` effective range at `session_at`.

### 4.4 Expense Contract (required)

- Expense scope filter:
  - `expenses.user_id = auth user`
  - `expenses.date_purchased >= month_start_local_date`
  - `expenses.date_purchased < month_end_local_date`
- Grouping key for category chart: `expenses.category`.
- Total expenses metric: sum of all category totals in the month window.

### 4.5 Dashboard Card Inventory

Required cards and display order:

1. Take-home summary
2. Client retention rate
3. Average profit per session
4. Hours spent tattooing
5. Expenses by category

## 5) Metric Definitions

### 5.1 Take-home Summary Card

Card must show:

- Gross take home
- Amount paid to studio
- Total expenses
- Net take home

#### 5.1.1 Gross take home

`gross_take_home_minor = SUM(sessions.price within month window)`

#### 5.1.2 Amount paid to studio

Studio deduction is computed from session rows using the compensation version active for each session.

- If `pay_chair_rent = false`: deduction contribution is `0`.
- If `rent_type = commission`:
  - Determine period bucket by compensation rule:
    - uncapped commission: monthly aggregation bucket
    - capped weekly: local week bucket (Monday start)
    - capped monthly: local month bucket
  - Compute `period_gross_minor = SUM(session.price)` inside each bucket and compensation version.
  - Compute `commission_raw_minor = floor(period_gross_minor * commission_rate_bps / 10000)`.
  - If capped:
    - `period_deduction_minor = MIN(commission_raw_minor, commission_cap_amount_minor)`.
  - If not capped:
    - `period_deduction_minor = commission_raw_minor`.
- If `rent_type = fixed`:
  - Frequency is `weekly` or `monthly`.
  - Deduct one fixed amount per local rent bucket that overlaps the dashboard month and has an active matching compensation version.
  - Weekly buckets use local Monday boundaries.
  - Monthly buckets use local calendar month boundaries.

`paid_to_studio_minor = SUM(period_deduction_minor across all applicable buckets)`

#### 5.1.3 Net take home

`net_take_home_minor = gross_take_home_minor - paid_to_studio_minor - total_expenses_minor`

### 5.2 Client Retention Rate Card

Chosen retention definition for Slice 5:

`retention_rate = clients_with_2plus_sessions_in_month / unique_clients_in_month`

Where:

- `unique_clients_in_month` = distinct `client_id` with at least one month-window session.
- `clients_with_2plus_sessions_in_month` = distinct `client_id` with at least two month-window sessions.
- If denominator is `0`, display `0%` (never NaN).

### 5.3 Average Profit per Session Card

`avg_profit_per_session_minor = net_take_home_minor / session_count_in_month`

Where:

- `session_count_in_month` = count of sessions in month window.
- If denominator is `0`, display `0` in account currency.

### 5.4 Hours Spent Tattooing Card

`hours_tattooing = SUM(sessions.session_duration) / 60`

Rules:

- Aggregate in DB (single grouped query path, no row-by-row iteration in app layer).
- If no sessions in window, display `0h`.

### 5.5 Expenses by Category Card

- Chart data:
  - `category_totals[category] = SUM(expenses.amount_minor by category in month window)`
- Card total:
  - `total_expenses_minor = SUM(all month-window expenses)`
- Categories with no expenses should still render with `0` value when chart component expects a stable category axis.

## 6) API Requirements

Add dashboard analytics read route:

- `GET /api/dashboard/analytics?month=current`

Response contract must include:

- `monthLabel`
- `timeWindow` (`startUtcIso`, `endUtcIso`, `timezone`)
- `takeHome` (`grossMinor`, `paidToStudioMinor`, `totalExpensesMinor`, `netMinor`)
- `retention` (`numerator`, `denominator`, `rate`)
- `averageProfitPerSession` (`valueMinor`, `sessionCount`)
- `hoursTattooing` (`totalMinutes`, `totalHours`)
- `expensesByCategory` (`items[]`, `totalMinor`)

Auth behavior:

- Must require authenticated user.
- Unauthenticated requests return `401`.

Error behavior:

- Return stable error codes.
- Do not return raw SQL/RPC internals to clients.

## 7) Query and Performance Requirements

### 7.1 Query shape

- Prefer one server-side analytics aggregation flow per dashboard fetch.
- Minimize round trips by grouping compatible aggregates.
- Avoid loading full session/expense row sets into memory for math.

### 7.2 Required index support

Foundation PR must ensure indexes support month-window lookups:

- `sessions (user_id, session_at desc)`
- `sessions (user_id, compensation_version_id, session_at desc)`
- `expenses (user_id, date_purchased desc)` (already present; verify)
- `expenses (user_id, category, date_purchased desc)` (add if needed)
- `artist_compensation_versions (user_id, effective_from desc)` (already present; verify)

### 7.3 Timezone correctness

- Compute month boundaries once per request with profile timezone.
- Reuse those boundaries consistently across all metric queries.

## 8) Frontend Requirements

### 8.1 Dashboard page layout

- Keep route at `/dashboard`.
- Replace placeholder section with analytics cards.
- Title format: `{MonthName} stats`.
- Mobile-first layout with responsive card grid on larger screens.

### 8.2 Card presentation

- Each metric is a separate card.
- Use existing site styling and shadcn/Tailwind patterns already used in dashboard routes.
- Include loading, empty, and error states per card.
- Use clear currency/percentage formatting from profile defaults.

### 8.3 Charts

- Take-home summary uses a simple comparative bar visualization:
  - gross vs paid-to-studio vs expenses vs net.
- Expenses card uses category bar chart with total displayed beneath chart.

## 9) Validation and Edge Cases

### 9.1 General

- No sessions and no expenses: all numeric outputs should be `0`.
- Null `compensation_version_id` on legacy sessions: fallback compensation resolution required.
- Mixed compensation versions inside month: calculations must honor each session's effective version.

### 9.2 Commission-specific

- Capped weekly commission must apply cap per local week bucket, not per month.
- Capped monthly commission must apply cap per local month bucket.
- Uncapped commission must not apply cap fields even if stale values exist in malformed data.

### 9.3 Fixed-rent-specific

- Weekly fixed rent uses Monday-start weekly buckets in reporting timezone.
- Monthly fixed rent uses local month bucket boundaries.
- If compensation changes mid-month, apply fixed deductions only for buckets where that version is active.

### 9.4 Safety and data quality

- Never emit `NaN`, `Infinity`, or negative zero in API/UI outputs.
- Retention and average values must gracefully handle zero-denominator branches.

## 10) Testing Requirements

### 10.1 Unit tests

Cover:

- Month boundary calculation in multiple timezones.
- Take-home formulas:
  - no chair rent
  - uncapped commission
  - capped weekly commission
  - capped monthly commission
  - fixed weekly rent
  - fixed monthly rent
  - compensation version boundary crossing
- Net take-home composition (`gross - studio - expenses`).
- Retention numerator/denominator logic.
- Average profit divide-by-zero branch.
- Hours aggregation conversion minutes -> hours.
- Expense category rollup and total.

### 10.2 Integration/API tests

Cover:

- `GET /api/dashboard/analytics` auth guard.
- Stable response shape and error code behavior.
- Month window correctness when timezone differs from UTC.
- Stable analytics results using seeded fixtures.

### 10.3 E2E tests

Cover:

- Dashboard renders `{MonthName} stats`.
- Each analytics card appears and displays formatted values.
- Known seeded dataset produces expected card values.
- Empty-state user sees zeroed cards without runtime errors.
- Regression path where profile compensation changes and dashboard remains historically correct.

## 11) PR Delivery Plan

All dashboard additions must be implemented as separate PRs. Each PR should be split into logically scoped commits (schema/query, API/domain, UI, tests).

### PR 1: Foundation

- Add analytics domain types and shared formatting utilities.
- Add month-window timezone helper(s) for dashboard analytics.
- Add dashboard analytics API scaffold with stable response contract.
- Add base dashboard card layout and loading/error state scaffolding.
- Add/verify required indexes and performance guardrails.
- Add initial unit test scaffolding for analytics helpers.

### PR 2: Take-home Summary Card

- Implement gross revenue aggregation.
- Implement studio deduction logic for:
  - no chair rent
  - commission (capped/uncapped)
  - fixed weekly/monthly
- Implement net calculation including expenses deduction.
- Build take-home card UI + comparative bar visualization.
- Add full unit + integration + e2e coverage for take-home paths.

### PR 3: Client Retention Card

- Implement monthly repeat-client formula:
  - `clients_with_2plus_sessions_in_month / unique_clients_in_month`.
- Build retention card UI.
- Add unit + integration + e2e tests for numerator/denominator and zero-state branch.

### PR 4: Average Profit per Session Card

- Implement `net_take_home / session_count` metric.
- Build average-profit card UI.
- Add tests for standard and zero-session scenarios.

### PR 5: Hours Tattooing Card

- Implement DB-side duration aggregation from `sessions.session_duration`.
- Build hours card UI.
- Add tests for aggregation correctness and empty-state behavior.

### PR 6: Expenses by Category Card

- Implement grouped expense totals by `expenses.category` and month total.
- Build category bar chart + total expenses display.
- Add tests for sparse category data and full-category fixtures.

### PR 7: Dashboard Hardening

- Final cross-card QA and formatting consistency pass.
- Accessibility checks for card semantics and chart labels.
- Performance verification against representative seeded data.
- Final e2e pass covering complete dashboard flow.

## 12) Acceptance Criteria

- Dashboard shows current month title and all five analytics cards.
- Every card uses the same timezone-correct month window.
- Take-home card correctly handles all compensation modes and caps.
- Retention uses the selected monthly repeat-client definition.
- Average profit and retention handle zero-denominator cases safely.
- Hours and expense rollups are computed via performant DB aggregations.
- Each dashboard addition lands in a separate PR after the foundation PR.
- Unit, integration, and e2e tests cover primary paths and edge cases.
