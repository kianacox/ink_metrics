import { NextResponse } from "next/server";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { dismissAction, fetchActionOwner } from "@/lib/actions/action-db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to dismiss actions.",
  );
  if (errorResponse) return errorResponse;

  const { actionId } = await params;
  const userId = user!.id;

  const ownerResult = await fetchActionOwner(supabase, actionId);
  if ("error" in ownerResult) {
    return NextResponse.json({ error: ownerResult.error, code: "ACTION_NOT_FOUND" }, { status: 404 });
  }

  if (ownerResult.userId !== userId) {
    return NextResponse.json({ error: "Forbidden.", code: "ACTION_FORBIDDEN" }, { status: 403 });
  }

  const dismissResult = await dismissAction(supabase, actionId, userId);
  if ("error" in dismissResult) {
    return NextResponse.json(
      { error: dismissResult.error, code: "ACTION_DISMISS_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
