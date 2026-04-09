import { parseSessionCreatePayload } from "@/lib/sessions/session-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

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

  let clientId = payload.selectedClientId;
  let createdClient: { client_id: string; name: string } | null = null;

  if (payload.createNewClient) {
    const { data: duplicateRows, error: duplicateError } = await supabase
      .from("clients")
      .select("client_id,name")
      .eq("user_id", user.id)
      .ilike("name", payload.clientName);

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 400 });
    }

    const duplicate = (duplicateRows ?? []).some(
      (row) => row.name.trim().toLowerCase() === payload.clientName.toLowerCase(),
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error: "A client with this name already exists. Choose it from Existing client.",
        },
        { status: 409 },
      );
    }

    const newClientId = crypto.randomUUID();
    const { data: insertedClient, error: insertClientError } = await supabase
      .from("clients")
      .insert({
        client_id: newClientId,
        user_id: user.id,
        name: payload.clientName,
        contact_info: payload.clientContact.length > 0 ? payload.clientContact : null,
      })
      .select("client_id,name")
      .single();

    if (insertClientError) {
      return NextResponse.json({ error: insertClientError.message }, { status: 400 });
    }

    if (!insertedClient?.client_id) {
      return NextResponse.json({ error: "Could not create the new client." }, { status: 500 });
    }

    clientId = insertedClient.client_id;
    createdClient = insertedClient;
  } else if (clientId) {
    const { data: existingClient, error: existingClientError } = await supabase
      .from("clients")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (existingClientError) {
      return NextResponse.json({ error: existingClientError.message }, { status: 400 });
    }

    if (!existingClient?.client_id) {
      return NextResponse.json({ error: "Selected client was not found." }, { status: 400 });
    }
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "Select an existing client before saving." },
      { status: 400 },
    );
  }

  const { data: compensationRows, error: compensationError } = await supabase
    .from("artist_compensation_versions")
    .select("compensation_version_id")
    .eq("user_id", user.id)
    .lte("effective_from", payload.sessionAtIso)
    .or(`effective_to.is.null,effective_to.gt.${payload.sessionAtIso}`)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (compensationError) {
    return NextResponse.json({ error: compensationError.message }, { status: 400 });
  }

  const compensationVersionId = compensationRows?.[0]?.compensation_version_id;
  if (!compensationVersionId) {
    return NextResponse.json(
      { error: "No compensation settings are active for this session date/time." },
      { status: 409 },
    );
  }

  const { error: sessionInsertError } = await supabase.from("sessions").insert({
    session_id: crypto.randomUUID(),
    user_id: user.id,
    client_id: clientId,
    price: payload.priceMinor,
    session_duration: payload.sessionDurationMinutes,
    session_at: payload.sessionAtIso,
    compensation_version_id: compensationVersionId,
  });

  if (sessionInsertError) {
    return NextResponse.json({ error: sessionInsertError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    client: createdClient,
  });
}
