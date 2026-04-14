import { parseClientCreatePayload } from "@/lib/clients/client-write";
import { fetchClientsPage } from "@/lib/clients/fetch-clients-page";
import type { ClientSortField } from "@/lib/clients/models";
import type { SessionDateRangePreset } from "@/lib/timezones";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { NextResponse } from "next/server";

const VALID_SORT_FIELDS = new Set<ClientSortField>(["session_count", "total_value"]);
const VALID_DATE_RANGES = new Set<SessionDateRangePreset>([
  "thisMonth",
  "last30Days",
  "last90Days",
  "yearToDate",
  "allTime",
]);
const DEFAULT_PAGE_SIZE = 25;

function errorJson(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status });
}

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
  const rawSort = params.get("sort") ?? "session_count";
  const sortField: ClientSortField = VALID_SORT_FIELDS.has(rawSort as ClientSortField)
    ? (rawSort as ClientSortField)
    : "session_count";

  const rawDateRange = params.get("dateRange") ?? "last90Days";
  const dateRange: SessionDateRangePreset = VALID_DATE_RANGES.has(
    rawDateRange as SessionDateRangePreset,
  )
    ? (rawDateRange as SessionDateRangePreset)
    : "last90Days";

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
    const result = await fetchClientsPage({
      supabase,
      reportingTimezone,
      searchQuery,
      sortField,
      pageIndex,
      pageSize,
      dateRange,
    });

    return NextResponse.json({
      clients: result.rows,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Could not compute date range boundaries.") {
      return errorJson(400, "CLIENTS_DATE_RANGE_INVALID", err.message);
    }
    return errorJson(500, "CLIENTS_FETCH_FAILED", "Could not load clients.");
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
    const status =
      rpcError.message === "A client with this name already exists." ? 409 : 400;
    const message =
      rpcError.message === "A client with this name already exists."
        ? rpcError.message
        : "Could not create client.";
    const code =
      rpcError.message === "A client with this name already exists."
        ? "CLIENT_ALREADY_EXISTS"
        : "CLIENT_CREATE_FAILED";
    return errorJson(status, code, message);
  }

  return NextResponse.json({ success: true, clientId });
}
