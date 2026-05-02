import { NextResponse } from "next/server";

/**
 * Shared JSON error response helper for API route handlers.
 *
 * All API handlers return errors in the shape `{ error, code }` with an
 * HTTP status. This helper centralises the construction so handlers stay
 * focused on business behaviour rather than HTTP plumbing.
 */
export function errorJson(error: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error, code }, { status });
}
