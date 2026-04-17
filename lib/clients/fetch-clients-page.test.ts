import { fetchClientsPage } from "./fetch-clients-page";
import { decodeCompositeCursor } from "@/lib/pagination/cursor";

describe("fetchClientsPage", () => {
  it("calls RPC with user id and cursor args", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          client_id: "client-1",
          name: "Client One",
          contact_info: null,
          created_at: "2026-01-01T00:00:00.000Z",
          last_session_at: null,
          lifetime_session_count: 1,
          lifetime_total_value_minor: 20000,
          range_session_count: 1,
          range_total_value_minor: 20000,
        },
      ],
      error: null,
    });
    const supabase = { rpc } as unknown as Parameters<typeof fetchClientsPage>[0]["supabase"];

    const result = await fetchClientsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "UTC",
      searchQuery: "  client  ",
      sortField: "session_count",
      cursor: null,
      limit: 25,
      dateRange: "allTime",
    });

    expect(rpc).toHaveBeenCalledWith("fetch_clients_page", {
      p_user_id: "user-1",
      p_date_range_start: null,
      p_search: "client",
      p_sort_by: "session_count",
      p_page_size: 26,
      p_cursor_sort_value: null,
      p_cursor_client_id: null,
    });
    expect(result.data).toHaveLength(1);
  });

  it("throws a generic error when RPC fails", async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "db exploded" },
      }),
    } as unknown as Parameters<typeof fetchClientsPage>[0]["supabase"];

    await expect(
      fetchClientsPage({
        supabase,
        userId: "user-1",
        reportingTimezone: "UTC",
        searchQuery: "",
        sortField: "session_count",
        cursor: null,
        limit: 10,
        dateRange: "allTime",
      }),
    ).rejects.toThrow("db exploded");
  });

  it("generates nextCursor from the last kept record", async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            client_id: "client-2",
            name: "Client Two",
            contact_info: null,
            created_at: "2026-01-02T00:00:00.000Z",
            last_session_at: null,
            lifetime_session_count: 2,
            lifetime_total_value_minor: 40000,
            range_session_count: 2,
            range_total_value_minor: 40000,
          },
          {
            client_id: "client-1",
            name: "Client One",
            contact_info: null,
            created_at: "2026-01-01T00:00:00.000Z",
            last_session_at: null,
            lifetime_session_count: 1,
            lifetime_total_value_minor: 20000,
            range_session_count: 1,
            range_total_value_minor: 20000,
          },
        ],
        error: null,
      }),
    } as unknown as Parameters<typeof fetchClientsPage>[0]["supabase"];

    const result = await fetchClientsPage({
      supabase,
      userId: "user-1",
      reportingTimezone: "UTC",
      searchQuery: "",
      sortField: "session_count",
      cursor: null,
      limit: 1,
      dateRange: "allTime",
    });

    expect(result.hasNextPage).toBe(true);
    expect(decodeCompositeCursor(result.nextCursor)).toEqual({
      sortValue: 2,
      id: "client-2",
    });
  });
});
