import { errorJson } from "@/lib/api-response";
import {
  parseClientCreateRpcError,
  parseClientDateRange,
  parseClientSortField,
  parseClientTier,
} from "@/lib/clients/client-query-params";
import { parseClientCreatePayload } from "@/lib/clients/client-write";
import { fetchClientsPage } from "@/lib/clients/fetch-clients-page";
import { DEFAULT_PAGE_LIMIT } from "@/lib/constants";
import { CursorDecodeError, decodeCompositeCursor } from "@/lib/pagination/cursor";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to list clients.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to list clients." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const searchQuery = params.get("search") ?? "";
  const sortField = parseClientSortField(params.get("sort"));
  const dateRange = parseClientDateRange(params.get("dateRange"));

  const limit = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(params.get("limit") ?? String(DEFAULT_PAGE_LIMIT), 10) ||
        DEFAULT_PAGE_LIMIT,
    ),
  );

  const reportingTimezone = params.get("tz") ?? "UTC";
  const cursorParam = params.get("cursor");

  const { data: tier, error: tierError } = parseClientTier(params.get("tier"));
  if (tierError) {
    return errorJson(tierError, "CLIENTS_INVALID_TIER", 400);
  }

  try {
    const cursor = decodeCompositeCursor(cursorParam);
    const result = await fetchClientsPage({
      supabase,
      userId: user.id,
      reportingTimezone,
      searchQuery,
      sortField,
      cursor,
      limit,
      dateRange,
      tier,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CursorDecodeError) {
      return errorJson(err.message, "CLIENTS_CURSOR_INVALID", 400);
    }
    if (err instanceof Error && err.message === "Could not compute date range boundaries.") {
      return errorJson(err.message, "CLIENTS_DATE_RANGE_INVALID", 400);
    }
    return errorJson("Could not load clients.", "CLIENTS_FETCH_FAILED", 500);
  }
}

export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to create a client.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to create a client." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { data: payload, error: payloadError } = parseClientCreatePayload(body);
  if (!payload || payloadError) {
    return NextResponse.json(
      { error: payloadError ?? "Client payload is invalid." },
      { status: 400 },
    );
  }

  const { data: clientId, error: rpcError } = await supabase.rpc("create_client", {
    p_name: payload.name,
    p_contact_info: payload.contactInfo || null,
  });

  if (rpcError) {
    const { status, code, message } = parseClientCreateRpcError(rpcError.message);
    return errorJson(message, code, status);
  }

  return NextResponse.json({ success: true, clientId });
}
