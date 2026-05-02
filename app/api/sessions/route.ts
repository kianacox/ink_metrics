import { DEFAULT_PAGE_LIMIT } from "@/lib/constants";
import { fetchSessionsPage } from "@/lib/sessions/fetch-sessions-page";
import { CursorDecodeError, decodeCompositeCursor } from "@/lib/pagination/cursor";
import { parseSessionCreatePayload } from "@/lib/sessions/session-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import type { SessionSortField } from "@/lib/sessions/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { NextResponse } from "next/server";

const VALID_SORT_FIELDS = new Set<SessionSortField>(["date", "profit"]);
const VALID_DATE_RANGES = new Set<SessionDateRangePreset>([
  "last30Days",
  "last90Days",
  "yearToDate",
  "allTime",
]);

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

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
  const rawSort = params.get("sort") ?? "date";
  const sortField: SessionSortField = VALID_SORT_FIELDS.has(rawSort as SessionSortField)
    ? (rawSort as SessionSortField)
    : "date";

  const rawDateRange = params.get("dateRange") ?? "last30Days";
  const dateRange: SessionDateRangePreset = VALID_DATE_RANGES.has(
    rawDateRange as SessionDateRangePreset,
  )
    ? (rawDateRange as SessionDateRangePreset)
    : "last30Days";

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
      return errorJson(400, "SESSIONS_CURSOR_INVALID", err.message);
    }
    if (err instanceof Error && err.message === "Could not compute date range boundaries.") {
      return errorJson(400, "SESSIONS_DATE_RANGE_INVALID", err.message);
    }
    return errorJson(500, "SESSIONS_FETCH_FAILED", "Could not load sessions.");
  }
}

function getRpcErrorStatus(message: string): number {
  if (
    message === "A client with this name already exists. Choose it from Existing client." ||
    message === "No compensation settings are active for this session date."
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
      p_session_at: payload.sessionDate,
      p_through_ads: payload.throughAds,
      p_in_progress: payload.inProgress,
    },
  );

  if (rpcError) {
    const status = getRpcErrorStatus(rpcError.message);
    const knownUserSafeMessage =
      rpcError.message === "A client with this name already exists. Choose it from Existing client." ||
      rpcError.message === "No compensation settings are active for this session date." ||
      rpcError.message === "You must be signed in to log a session." ||
      rpcError.message === "Select an existing client before saving." ||
      rpcError.message === "Selected client was not found." ||
      rpcError.message === "Client name is required for a new client.";

    return NextResponse.json(
      {
        error: knownUserSafeMessage ? rpcError.message : "Could not create session.",
        code: knownUserSafeMessage ? "SESSION_CREATE_VALIDATION_FAILED" : "SESSION_CREATE_FAILED",
      },
      { status },
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
