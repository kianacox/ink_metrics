import { fetchSessionsPage } from "@/lib/sessions/fetch-sessions-page";
import { parseSessionCreatePayload } from "@/lib/sessions/session-write";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import type { SessionSortField } from "@/components/dashboard/sessions/utils/session-listing";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { NextResponse } from "next/server";

const VALID_SORT_FIELDS = new Set<SessionSortField>(["date", "duration", "profit"]);
const VALID_DATE_RANGES = new Set<SessionDateRangePreset>([
  "last30Days",
  "last90Days",
  "yearToDate",
  "allTime",
]);
const DEFAULT_PAGE_SIZE = 25;

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

  const pageIndex = Math.max(0, Number.parseInt(params.get("page") ?? "0", 10) || 0);
  const pageSize = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(params.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE,
    ),
  );
  const reportingTimezone = params.get("tz") ?? "UTC";

  try {
    const result = await fetchSessionsPage({
      supabase,
      userId: user.id,
      reportingTimezone,
      searchQuery,
      sortField,
      pageIndex,
      pageSize,
      dateRange,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load sessions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
