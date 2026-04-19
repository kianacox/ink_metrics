import {
  parseSessionUpdatePayload,
} from "@/lib/sessions/session-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidSessionId(value: string): boolean {
  return UUID_REGEX.test(value);
}

function getUpdateRpcErrorStatus(message: string): number {
  if (message === "Session was not found.") {
    return 404;
  }
  if (
    message === "You must be signed in to update a session." ||
    message === "No compensation settings are active for this session date/time."
  ) {
    return 400;
  }
  return 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "Session id is invalid." }, { status: 400 });
  }

  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to update a session.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to update a session." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { data: payload, error: payloadError } = parseSessionUpdatePayload(body);
  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? "Session update payload is invalid." },
      { status: 400 },
    );
  }

  const { error: rpcError } = await supabase.rpc("update_owned_session", {
    p_session_id: sessionId,
    p_price_minor: payload.priceMinor,
    p_session_duration_minutes: payload.sessionDurationMinutes,
    p_session_at: payload.sessionAtIso,
    p_in_progress: payload.inProgress,
  });
  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message },
      { status: getUpdateRpcErrorStatus(rpcError.message) },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: "Session id is invalid." }, { status: 400 });
  }

  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to delete a session.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to delete a session." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("sessions")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .select("session_id");

  if (error) {
    return NextResponse.json({ error: "Could not delete session." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted: (data ?? []).length > 0,
  });
}
