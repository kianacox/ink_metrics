import { errorJson } from "@/lib/api-response";
import { DEFAULT_PAGE_LIMIT } from "@/lib/constants";
import { fetchSessionsPage } from "@/lib/sessions/fetch-sessions-page";
import {
  CursorDecodeError,
  decodeCompositeCursor,
} from "@/lib/pagination/cursor";
import {
  parseSessionDateRange,
  parseSessionSortField,
} from "@/lib/sessions/session-query-params";
import { mapSessionCreateRpcError } from "@/lib/sessions/session-rpc-error";
import { parseSessionCreatePayload } from "@/lib/sessions/session-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import type { SessionSortField } from "@/lib/sessions/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedApiUser(
    "You must be signed in to view sessions.",
  );
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view sessions." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const searchQuery = params.get("search") ?? "";
  const sortField = parseSessionSortField(params.get("sort"));
  const dateRange = parseSessionDateRange(params.get("dateRange"));

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

  try {
    const cursor = decodeCompositeCursor(cursorParam);
    const result = await fetchSessionsPage({
      supabase,
      userId: user.id,
      reportingTimezone,
      searchQuery,
      sortField,
      cursor,
      limit,
      dateRange,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CursorDecodeError) {
      return errorJson(err.message, "SESSIONS_CURSOR_INVALID", 400);
    }
    if (
      err instanceof Error &&
      err.message === "Could not compute date range boundaries."
    ) {
      return errorJson(err.message, "SESSIONS_DATE_RANGE_INVALID", 400);
    }
    return errorJson("Could not load sessions.", "SESSIONS_FETCH_FAILED", 500);
  }
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
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { data: payload, error: payloadError } =
    parseSessionCreatePayload(body);
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
      p_session_at: payload.sessionDate,
      p_through_ads: payload.throughAds,
      p_in_progress: payload.inProgress,
    },
  );

  if (rpcError) {
    const { status, code, message } = mapSessionCreateRpcError(
      rpcError.message,
    );
    return errorJson(message, code, status);
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
