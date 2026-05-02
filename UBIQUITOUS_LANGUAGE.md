# Ubiquitous Language — ink_metrics

Shared vocabulary for engineers, designers, and product. When in doubt, use the **Canonical term** column in code, APIs, and specs.

---

## Core Entities


| Canonical term | Definition                                                                  | Interchangeable / user-facing terms | Notes                                                                         |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| **Artist**     | The tattoo artist who owns the account                                      | User, tattooer                      | Primary actor. All data is scoped to a single artist per account.             |
| **Session**    | One tattoo appointment logged by the artist                                 | Job, appointment, booking, tattoo   | Not a Supabase auth session. Represents billable work done.                   |
| **Client**     | A person the artist has logged at least one session for                     | Customer, client name               | Created on first session log. May have 0 sessions if created standalone.      |
| **Expense**    | A business cost the artist records                                          | Cost, purchase, outgoing            | Always associated with one artist. Has a category, amount, and purchase date. |
| **Profile**    | Artist account configuration — display name, currency, timezone, chair rent | Account settings, settings          | Distinct from auth identity. Compensation settings live here.                 |


---

## Financial & Compensation


| Canonical term        | Definition                                                                        | Interchangeable / user-facing terms   | Notes                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Minor amount**      | Integer representation of money in the smallest currency unit (e.g. pence, cents) | —                                     | Suffix `Minor` on all money fields: `priceMinor`, `amountMinor`, `grossMinor`. `1000 = £10.00`. Never use floats for money.    |
| **Bps**               | Basis points — unit for commission rates. 100 bps = 1%                            | —                                     | Suffix `Bps` on rate fields: `commissionRateBps`. Range 1–10000.                                                               |
| **Gross**             | Total session revenue before any deductions for a period                          | Revenue, total earned                 | `grossMinor` in `TakeHomeSummary`.                                                                                             |
| **Net**               | Take-home after paid-to-studio and expenses are deducted                          | Take-home pay                         | `netMinor` in `TakeHomeSummary`.                                                                                               |
| **Paid to studio**    | Amount deducted for the artist's chair rent arrangement                           | Chair rent (user-facing)              | Canonical code term: `paidToStudioMinor`. User-facing label: "Chair rent".                                                     |
| **Chair rent**        | The artist's financial arrangement with their studio                              | Compensation settings, paid to studio | User-facing term only. Do not use as a code identifier — use `paidToStudio` or `chairRent` only where the UI label demands it. |
| **Take-home summary** | Dashboard card: gross, paid to studio, expenses, net for a month                  | —                                     | `TakeHomeSummary` interface.                                                                                                   |
| **Rent type**         | Whether studio payment is `fixed` (flat fee) or `commission` (percentage)         | Payment model                         | `RentType = "fixed" | "commission"`.                                                                                           |
| **Rent frequency**    | Billing cadence for fixed rent: `weekly` or `monthly`                             | —                                     | `RentFrequency`. Also used for commission cap frequency.                                                                       |
| **Commission cap**    | Maximum commission the studio can claim per period                                | Cap                                   | Optional. Only applies when `commissionCapped = true`.                                                                         |
| **Fixed rent**        | Flat recurring payment to the studio                                              | Chair rent (fixed)                    | Requires `rentType = "fixed"`, `fixedFrequency`, `fixedAmountMinor`.                                                           |
| **Commission rent**   | Percentage of session revenue paid to the studio                                  | Chair rent (commission)               | Requires `rentType = "commission"`, `commissionRateBps`.                                                                       |
| **Default currency**  | The artist's primary currency for display and input                               | Currency                              | `ProfileCurrency = "GBP" | "USD" | "EUR"`. Stored on profile.                                                                  |


---

## Compensation Versioning


| Canonical term           | Definition                                                                                                   | Interchangeable / user-facing terms | Notes                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| **Compensation version** | A time-bounded record of an artist's chair rent arrangement                                                  | —                                   | DB table: `artist_compensation_versions`. Multiple rows form a non-overlapping timeline.      |
| **Effective from**       | The date a compensation version becomes active                                                               | Start date                          | `effective_from`. Changes never apply retroactively — always effective the day after saving.  |
| **Effective to**         | The date a compensation version is closed (exclusive)                                                        | End date                            | `effective_to`. `NULL` means the version is current.                                          |
| **Rollover**             | Closing the active version (`effective_to = tomorrow`) and inserting a new one (`effective_from = tomorrow`) | —                                   | Only triggered when chair rent settings change. Display name changes do NOT trigger rollover. |


---

## Client Tiers

Computed from `lifetimeSessionCount`. Never manually assigned. No stored field.


| Canonical term | Condition                | Empty state label          |
| -------------- | ------------------------ | -------------------------- |
| **One-timer**  | 0 or 1 lifetime sessions | "No one-time clients yet." |
| **Regular**    | 2–4 lifetime sessions    | "No regular clients yet."  |
| **VIP**        | 5+ lifetime sessions     | "No VIP clients yet."      |


**Rules:**

- Thresholds are fixed, not configurable.
- A client with 0 sessions (created before any session is logged) is a One-timer.
- The former "Returning" binary badge is replaced by tier on all client rows.

---

## Client Metrics


| Canonical term             | Definition                                             | Notes                                                            |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| **Lifetime session count** | Total sessions for a client across all time            | `lifetimeSessionCount` on `ClientListItem`. Used to derive tier. |
| **Lifetime total value**   | Total revenue from a client across all time            | `lifetimeTotalValueMinor`. Not date-range scoped.                |
| **Range session count**    | Sessions within the currently active date range filter | `rangeSessionCount`. Changes with filter selection.              |
| **Range total value**      | Revenue within the current date range filter           | `rangeTotalValueMinor`.                                          |
| **Last session at**        | Date of the client's most recent session               | `lastSessionAt`. Used by action signal queries.                  |


---

## Action Cards & Retention


| Canonical term           | `actionType` value | Display label | Priority | Trigger condition                                       |
| ------------------------ | ------------------ | ------------- | -------- | ------------------------------------------------------- |
| **Lapsed repeat**        | `lapsed_repeat`    | Retention     | HIGH     | 2+ sessions, last session 56+ days ago                  |
| **New client follow-up** | `new_client`       | Follow-up     | MEDIUM   | Exactly 1 session, 42+ days ago                         |
| **In-progress session**  | `in_progress`      | In Progress   | MEDIUM   | Session with `inProgress = true`, 28+ days since logged |



| Canonical term       | Definition                                                                   | Notes                                                                                             |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Action card**      | UI component surfacing a client retention nudge                              | Maps 1:1 to a `ClientAction`. Displayed on the insights/actions tab.                              |
| **Client action**    | Domain entity representing a retention signal for a specific client          | `ClientAction` interface. Has `actionType`, `clientId`, `revenueAtRiskMinor`, `messageTemplate`.  |
| **Signal**           | Computed condition (from session/client data) that triggers an action upsert | Internal term. `LapsedRepeatSignal`, `NewClientSignal`, `InProgressSignal`. Not surfaced in UI.   |
| **Revenue at risk**  | Estimated revenue value attached to an action card                           | `revenueAtRiskMinor`. Average session price for lapsed/new; session price for in-progress.        |
| **Weeks since**      | Weeks elapsed since the triggering session                                   | `weeksSince`. Computed but not shown in card UI.                                                  |
| **Upsert operation** | How an action signal is processed: `insert`, `reactivate`, or `skip`         | `UpsertOperation`. Determines whether a new action row is created or an existing one reactivated. |


---

## Analytics Dashboard


| Canonical term                 | Definition                                                                  | Notes                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Month window**               | The selected month's time range as UTC ISO start/end                        | `DashboardMonthWindow`. Derived from `?month=YYYY-MM` URL param.                                            |
| **Reporting timezone**         | The artist's local timezone, used to bucket session and expense dates       | `reportingTimezone` on profile. All date math localises to this timezone before computing month boundaries. |
| **Retention rate**             | Lifetime percentage of clients with 2+ sessions                             | `RetentionStat`. Always lifetime-scoped — does not change month to month.                                   |
| **Average profit per session** | Net ÷ session count for the selected month                                  | `AverageProfitPerSessionStat`. Month-scoped.                                                                |
| **Expenses by category**       | Grouped expense totals for the selected month                               | `ExpensesByCategoryStat`. Month-scoped.                                                                     |
| **hasPriorMonthData**          | API flag indicating whether the previous month has any sessions or expenses | Drives back-button enabled state. Avoids a separate preflight request.                                      |
| **Current month ceiling**      | The rule preventing forward navigation past the current month               | Forward nav button is disabled when viewing the current month.                                              |
| **Live computation**           | Analytics derived on-demand from raw rows (no snapshot table)               | V1 approach per ADR 0001. Future: `monthly_analytics_snapshots` (Slice 8).                                  |


---

## Expense Categories

Fixed set — not user-configurable.


| Code value        | Display label   |
| ----------------- | --------------- |
| `ink`             | Ink             |
| `cartridges`      | Cartridges      |
| `needles`         | Needles         |
| `machines`        | Machines        |
| `other_equipment` | Other equipment |
| `travel`          | Travel          |
| `miscellaneous`   | Miscellaneous   |


---

## Date Range Presets

Used across sessions, expenses, and client filters.


| Code value   | Meaning                                          |
| ------------ | ------------------------------------------------ |
| `thisMonth`  | Calendar month containing today (timezone-aware) |
| `last30Days` | Rolling 30-day window                            |
| `last90Days` | Rolling 90-day window                            |
| `yearToDate` | Jan 1 of current year to today                   |
| `allTime`    | No date filter applied                           |


---

## Communication Surfaces


| Canonical term | Audience                   | Destination                                  | Route       |
| -------------- | -------------------------- | -------------------------------------------- | ----------- |
| **Contact**    | Public (no login required) | Email to `support@inkmetrics.app` via Resend | `/contact`  |
| **Feedback**   | Authenticated artists only | Stored in `feedback` DB table                | `/feedback` |


**Contact subjects:** billing, bugs, partnerships, account issues.  
**Feedback categories:** Feature request, Bug report, General feedback.  
Neither surface shows past submissions to the user.

---

## Technical Conventions


| Convention                     | Meaning                                                                           | Example                                                           |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Minor` suffix                 | Money stored as integer smallest-unit (pence/cents)                               | `amountMinor = 1099` → £10.99                                     |
| `Bps` suffix                   | Percentage stored as basis points (1 bps = 0.01%)                                 | `commissionRateBps = 2000` → 20%                                  |
| `Payload` suffix               | Validated, typed struct ready for a write operation                               | `SessionCreatePayload`, `ExpenseCreatePayload`                    |
| `Candidate` suffix             | Unvalidated input struct awaiting type-checking                                   | `SessionCreatePayloadCandidate`                                   |
| `Signal` suffix                | Computed struct representing a detected retention condition                       | `LapsedRepeatSignal`                                              |
| `Row` suffix                   | DB-shaped struct returned from a query                                            | `SessionRow`                                                      |
| **Cursor pagination**          | Composite cursor `{ sortValue, id }` encoded as base64 for stable list pagination | `CompositeCursor` in `lib/pagination/cursor.ts`                   |
| **RLS**                        | Row Level Security — Supabase policy enforcing per-artist data isolation          | Never bypass with `createAdminClient` outside seeding/service ops |
| **Screaming-snake error code** | API error codes prefixed by domain in `UPPER_SNAKE_CASE`                          | `EXPENSES_FETCH_FAILED`, `SESSIONS_CREATE_FAILED`                 |


---

## Terms to Avoid

These appear in older conversations or docs but are not canonical:


| Avoid                      | Use instead                             | Reason                                         |
| -------------------------- | --------------------------------------- | ---------------------------------------------- |
| "Returning" (binary badge) | Client tier (One-timer / Regular / VIP) | Replaced by the three-tier system              |
| "Appointment"              | Session                                 | Session is the canonical term in code and UI   |
| "Hours tattooing"          | —                                       | Removed; session duration tracking was dropped |
| Slice specs in `docs/`     | Agent brief on the GitHub issue         | `docs/` is deprecated                          |


