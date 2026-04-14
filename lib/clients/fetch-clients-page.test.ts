import { fetchClientsPage } from "./fetch-clients-page";

describe("fetchClientsPage", () => {
  it("calls RPC without caller-provided user id", async () => {
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
          total_count: 1,
        },
      ],
      error: null,
    });
    const supabase = { rpc } as unknown as Parameters<typeof fetchClientsPage>[0]["supabase"];

    const result = await fetchClientsPage({
      supabase,
      reportingTimezone: "UTC",
      searchQuery: "  client  ",
      sortField: "session_count",
      pageIndex: 0,
      pageSize: 25,
      dateRange: "allTime",
    });

    expect(rpc).toHaveBeenCalledWith("fetch_clients_page", {
      p_date_range_start: null,
      p_search: "client",
      p_sort_by: "session_count",
      p_page_size: 26,
      p_offset: 0,
    });
    expect(result.totalCount).toBe(1);
    expect(result.rows).toHaveLength(1);
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
        reportingTimezone: "UTC",
        searchQuery: "",
        sortField: "session_count",
        pageIndex: 0,
        pageSize: 10,
        dateRange: "allTime",
      }),
    ).rejects.toThrow("db exploded");
  });
});
