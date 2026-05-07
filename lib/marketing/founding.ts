/**
 * Maximum number of founding-member spots available. Once the count of
 * profiles flagged as founding users reaches this number, the offer is full.
 */
export const FOUNDING_MEMBER_LIMIT = 50;

/**
 * Cache tag that can be passed to `revalidateTag` to force the next call to
 * `getFoundingCount` to bypass its cached value and re-query the database.
 * Lives in this server-safe module so test-only routes and Playwright specs
 * can import it without pulling in `server-only`.
 */
export const FOUNDING_COUNT_CACHE_TAG = "marketing:founding-count";
