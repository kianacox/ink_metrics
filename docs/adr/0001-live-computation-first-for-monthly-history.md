# ADR 0001: Live computation for V1 monthly history

## Status

Accepted

## Context

Monthly history navigation requires fetching financial metrics for past months. Two approaches were considered:

1. **Live computation** — query raw `sessions` and `expenses` tables per request, same as the current dashboard RPC.
2. **Snapshot persistence** — store computed monthly metrics in a `monthly_analytics_snapshots` table (already specced as Slice 8), read from there for history.

The app's long-term roadmap includes tax-ready data exports, which will require persisted monthly snapshots. Slice 8 is already specced for this.

## Decision

Use live computation for V1 monthly history. The API response shape is intentionally designed to match the future snapshot table contract — same fields, same semantics — so the backend can swap its data source from live RPCs to the snapshot table when Slice 8 lands, with no frontend changes required.

## Consequences

- V1 ships faster with no new DB tables or job queues.
- Historical months recompute on every request. Acceptable given small per-artist dataset sizes.
- When Slice 8 is implemented, the API layer is the only thing that changes. Frontend and API contract are stable.
- If session/expense data is edited retroactively, historical months automatically reflect the correction (no stale snapshot problem) — this is a V1 advantage, not a bug.
