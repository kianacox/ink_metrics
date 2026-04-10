import { parseSessionCreatePayload } from "@/lib/sessions/session-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

function getRpcErrorStatus(message: string): number {
  if (
    message === "A client with this name already exists. Choose it from Existing client." ||
    message === "No compensation settings are active for this session date/time."
  ) {
    return 409;
  }
  if (
    message === "You must be signed in to log a session." ||
    message === "Select an existing client before saving." ||
    message === "Selected client was not found." ||
    message === "Client name is required for a new client."
  ) {
    return 400;
  }
  return 400;
}

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to log a session.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to log a session." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { data: payload, error: payloadError } = parseSessionCreatePayload(body);
  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? "Session payload is invalid." },
      { status: 400 },
    );
  }
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "create_session_with_optional_client",
    {
      p_selected_client_id: payload.selectedClientId,
      p_create_new_client: payload.createNewClient,
      p_client_name: payload.clientName,
      p_client_contact: payload.clientContact,
      p_price_minor: payload.priceMinor,
      p_session_duration_minutes: payload.sessionDurationMinutes,
      p_session_at: payload.sessionAtIso,
      p_through_ads: payload.throughAds,
    },
  );

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message },
      { status: getRpcErrorStatus(rpcError.message) },
    );
  }

  const rpcRow = rpcRows?.[0];
  const createdClient =
    rpcRow?.created_client_id && rpcRow.created_client_name
      ? {
          client_id: rpcRow.created_client_id,
          name: rpcRow.created_client_name,
        }
      : null;

  return NextResponse.json({
    success: true,
    client: createdClient,
  });
}
