import { NextResponse } from "next/server";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { computeAndUpsertActions } from "@/lib/actions/compute-and-upsert-actions";

export async function GET() {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to view actions.",
  );
  if (errorResponse) return errorResponse;

  try {
    const actions = await computeAndUpsertActions(supabase, user!.id);
    return NextResponse.json({ actions });
  } catch (err) {
    const code = err instanceof Error ? err.message : "ACTIONS_FETCH_FAILED";
    const isKnownCode = code === "ACTIONS_UPSERT_FAILED" || code === "ACTIONS_FETCH_FAILED";
    return NextResponse.json(
      { error: "Could not load actions.", code: isKnownCode ? code : "ACTIONS_FETCH_FAILED" },
      { status: 500 },
    );
  }
}
