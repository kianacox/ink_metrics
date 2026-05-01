/**
 * Shared application constants.
 *
 * Constants here are cross-domain values that multiple modules depend on.
 * Domain-scoped constants (e.g. action thresholds in `lib/actions/`)
 * should stay in their domain module.
 */

/**
 * Default page size for cursor-paginated list endpoints.
 * Used by clients, sessions, and expenses list APIs.
 */
export const DEFAULT_PAGE_LIMIT = 25;
