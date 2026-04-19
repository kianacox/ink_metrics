import { NextResponse } from "next/server";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";

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

  const { data: action, error: fetchError } = await supabase
    .from("client_actions")
    .select("action_id, user_id")
    .eq("action_id", actionId)
    .single();

  if (fetchError || !action) {
    return NextResponse.json({ error: "Action not found.", code: "ACTION_NOT_FOUND" }, { status: 404 });
  }

  if (action.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden.", code: "ACTION_FORBIDDEN" }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("client_actions")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("action_id", actionId)
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json(
      { error: "Could not dismiss action.", code: "ACTION_DISMISS_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
