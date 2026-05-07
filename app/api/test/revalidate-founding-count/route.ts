import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { FOUNDING_COUNT_CACHE_TAG } from "@/lib/marketing/get-founding-count";

/**
 * Test-only endpoint that invalidates the cached founding-count so e2e tests
 * can deterministically observe a freshly-seeded database state without
 * waiting for `unstable_cache`'s soft TTL to expire.
 *
 * Gated on `NODE_ENV !== "production"` to ensure it can never be reached from
 * a production deployment.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Pass `{ expire: 0 }` so the next read recomputes immediately.
  revalidateTag(FOUNDING_COUNT_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ success: true });
}
