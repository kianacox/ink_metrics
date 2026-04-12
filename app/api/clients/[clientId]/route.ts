import { parseClientUpdatePayload } from "@/lib/clients/client-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidClientId(value: string): boolean {
  return UUID_REGEX.test(value);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await context.params;
  if (!isValidClientId(clientId)) {
    return NextResponse.json({ error: "Client id is invalid." }, { status: 400 });
  }

  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to update a client.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to update a client." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { data: payload, error: payloadError } = parseClientUpdatePayload(body);
  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? "Client update payload is invalid." },
      { status: 400 },
    );
  }

  const { error: rpcError } = await supabase.rpc("update_client", {
    p_client_id: clientId,
    p_name: payload.name,
    p_contact_info: payload.contactInfo || null,
  });

  if (rpcError) {
    if (rpcError.message === "Client was not found.") {
      return NextResponse.json({ error: rpcError.message }, { status: 404 });
    }
    if (rpcError.message === "A client with this name already exists.") {
      return NextResponse.json({ error: rpcError.message }, { status: 409 });
    }
    return NextResponse.json({ error: rpcError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await context.params;
  if (!isValidClientId(clientId)) {
    return NextResponse.json({ error: "Client id is invalid." }, { status: 400 });
  }

  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to delete a client.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to delete a client." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("client_id", clientId)
    .eq("user_id", user.id)
    .select("client_id");

  if (error) {
    if ((error as { code?: string }).code === "23503") {
      return NextResponse.json(
        { error: "This client is linked to sessions and cannot be deleted." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Could not delete client." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted: (data ?? []).length > 0,
  });
}
