import { getDateRangeStartUtcIso } from "@/lib/timezones";
import type {
  ClientListItem,
  FetchClientsPageParams,
  FetchClientsPageResult,
} from "@/lib/clients/models";

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
  total_count: number;
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

export async function fetchClientsPage({
  supabase,
  userId,
  reportingTimezone,
  searchQuery,
  sortField,
  pageIndex,
  pageSize,
  dateRange,
}: FetchClientsPageParams): Promise<FetchClientsPageResult> {
  const dateRangeStart = getDateRangeStartUtcIso({
    preset: dateRange,
    timezone: reportingTimezone,
  });

  if (dateRange !== "allTime" && !dateRangeStart) {
    throw new Error("Could not compute date range boundaries.");
  }

  const offset = pageIndex * pageSize;

  const { data, error } = await supabase.rpc("fetch_clients_page", {
    p_user_id: userId,
    p_date_range_start: dateRangeStart,
    p_search: searchQuery.trim(),
    p_sort_by: sortField,
    p_page_size: pageSize + 1,
    p_offset: offset,
  });

  if (error) {
    throw new Error(error.message ?? "Could not load clients.");
  }

  const rows = (data ?? []) as RpcRow[];
  const totalCount = rows[0]?.total_count ?? 0;
  const hasNextPage = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize).map(mapRpcRow);

  return {
    rows: pageRows,
    hasNextPage,
    totalCount: Number(totalCount),
  };
}
