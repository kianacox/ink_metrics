# QA Plan — Retention Card Insufficient Data Message

## Feature

When a user has fewer than 4 lifetime sessions **or** fewer than 3 lifetime unique clients, the "Lifetime client retention rate" card replaces its content with:

> ℹ️ Please log more clients and sessions to make use of this metric.

No percentage or "X of Y clients have returned." text is shown.

---

## Seeded Credentials

| User | Email | Password | Sessions | Clients | Expected |
|------|-------|----------|----------|---------|----------|
| Thin (below threshold) | `seeded-retention-thin@example.com` | `Password123!` | 2 | 2 | Message shows |
| Boundary (at threshold) | `seeded-retention-boundary@example.com` | `Password123!` | 4 | 3 (1 returning) | 33% rate shows |
| Demo (well above threshold) | `test@test.com` | `Password123` | 49 | 11 | 91% rate shows |
| Fresh (no data) | sign up a new account | — | 0 | 0 | "No data yet for this month." |

---

## Test Cases

### A — Message appears (below threshold)

| # | User | Steps | Expected |
|---|------|-------|----------|
| A1 | Thin | Log in → Dashboard → Insights tab | Retention card body shows info icon + message. No `%` value. |
| A2 | Thin | Inspect card header | Info `(i)` button still visible. Clicking opens retention formula modal. |
| A3 | Thin | Check other cards | Take-home, avg profit, expenses-by-category unaffected. |
| A4 | Thin | `GET /api/dashboard/analytics?month=current` | `retention.totalSessions = 2`, `retention.denominator = 2`, `retention.rate = 0`. |
| A5 | Thin | Hard-refresh insights page | Message still shows (not a loading flash). |

### B — Real rate appears (at/above threshold)

| # | User | Steps | Expected |
|---|------|-------|----------|
| B1 | Boundary | Log in → Dashboard → Insights tab | Retention card shows `33%` and `1 of 3 clients have returned.`. No message. |
| B2 | Boundary | `GET /api/dashboard/analytics?month=current` | `retention.totalSessions = 4`, `retention.denominator = 3`, `retention.numerator = 1`, `retention.rate ≈ 0.333`. |
| B3 | Demo | Log in → Dashboard → Insights tab | Retention card shows `91%` and `10 of 11 clients have returned.`. No message. |

### C — Edge: zero data (empty state)

| # | User | Steps | Expected |
|---|------|-------|----------|
| C1 | Fresh | Complete profile setup → Insights tab immediately | All cards show `"No data yet for this month."` — NOT the retention message. |
| C2 | Fresh | `GET /api/dashboard/analytics?month=current` | `retention.totalSessions = 0`, `retention.denominator = 0`. |

### D — Loading state

| # | Steps | Expected |
|---|-------|----------|
| D1 | Throttle network → navigate to Insights | Skeleton shimmer shows in retention card body while loading. |
| D2 | Skeleton resolves | Either message or real rate appears (no flash of both). |

### E — Retention info modal still works

| # | User | Steps | Expected |
|---|------|-------|----------|
| E1 | Thin | Click `(i)` button on retention card | Modal opens: "How client retention is calculated". |
| E2 | Thin | Press Escape or click backdrop | Modal closes. |

---

## Threshold boundary matrix

| Sessions | Clients | Shows message? |
|----------|---------|----------------|
| 0 | 0 | No (empty state instead) |
| 2 | 2 | **Yes** |
| 3 | 3 | **Yes** (3 < 4 sessions) |
| 4 | 2 | **Yes** (2 < 3 clients) |
| 4 | 3 | No |
| 49 | 11 | No |

---

## Pass criteria

- [ ] Thin user sees message, no percentage
- [ ] Boundary user sees `33%`, no message
- [ ] Demo user sees `91%`, no message
- [ ] Fresh user sees global empty state, not the retention message
- [ ] Info modal opens from retention card regardless of threshold state
- [ ] No regression on other analytics cards
