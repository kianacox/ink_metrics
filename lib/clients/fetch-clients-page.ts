import { getDateRangeStartDate } from "@/lib/timezones";
import type {
  ClientSortField,
  ClientListItem,
  FetchClientsPageParams,
  FetchClientsPageResult,
} from "@/lib/clients/models";
import { encodeCompositeCursor } from "@/lib/pagination/cursor";

interface RpcRow {
  client_id: string;
  name: string;
  contact_info: string | null;
  created_at: string;
  last_session_at: string | null;
  lifetime_session_count: number;
  lifetime_total_value_minor: number;
  range_session_count: number;
  range_total_value_minor: number;
}

function mapRpcRow(row: RpcRow): ClientListItem {
  return {
    id: row.client_id,
    name: row.name,
    contactInfo: row.contact_info ?? null,
    createdAt: row.created_at,
    lastSessionAt: row.last_session_at ?? null,
    lifetimeSessionCount: Number(row.lifetime_session_count),
    lifetimeTotalValueMinor: Number(row.lifetime_total_value_minor),
    rangeSessionCount: Number(row.range_session_count),
    rangeTotalValueMinor: Number(row.range_total_value_minor),
  };
}

function getSortValueForCursor(row: RpcRow, sortField: ClientSortField): number {
  if (sortField === "total_value") {
    return Number(row.range_total_value_minor);
  }
  return Number(row.range_session_count);
}

export async function fetchClientsPage({
  supabase,
  userId,
  reportingTimezone,
  searchQuery,
  sortField,
  cursor,
  limit,
  dateRange,
}: FetchClientsPageParams): Promise<FetchClientsPageResult> {
  const dateRangeStart = getDateRangeStartDate({
    preset: dateRange,
    timezone: reportingTimezone,
  });

  if (dateRange !== "allTime" && !dateRangeStart) {
    throw new Error("Could not compute date range boundaries.");
  }

  const cursorSortValue =
    cursor === null ? null : Number(cursor.sortValue);
  if (cursor !== null && Number.isNaN(cursorSortValue)) {
    throw new Error("Client cursor sort value must be a number.");
  }

  const { data, error } = await supabase.rpc("fetch_clients_page", {
    p_user_id: userId,
    p_date_range_start: dateRangeStart,
    p_search: searchQuery.trim(),
    p_sort_by: sortField,
    p_page_size: limit + 1,
    p_cursor_sort_value: cursorSortValue,
    p_cursor_client_id: cursor?.id ?? null,
  });

  if (error) {
    throw new Error(error.message ?? "Could not load clients.");
  }

  const rows = (data ?? []) as RpcRow[];
  const hasNextPage = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const mappedRows = pageRows.map(mapRpcRow);
  const lastRow = pageRows[pageRows.length - 1] ?? null;
  const nextCursor = hasNextPage && lastRow
    ? encodeCompositeCursor({
        sortValue: getSortValueForCursor(lastRow, sortField),
        id: lastRow.client_id,
      })
    : null;

  return {
    data: mappedRows,
    hasNextPage,
    nextCursor,
  };
}
