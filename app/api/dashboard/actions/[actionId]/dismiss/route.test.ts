/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { POST } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

const mockedAuth = jest.mocked(requireAuthenticatedApiUser);

function makeRequest(actionId: string) {
  return {
    request: new Request(`http://localhost/api/dashboard/actions/${actionId}/dismiss`, {
      method: "POST",
    }),
    params: Promise.resolve({ actionId }),
  };
}

function mockSupabase({
  action,
  fetchError = null,
  updateError = null,
}: {
  action?: { action_id: string; user_id: string } | null;
  fetchError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  const single = jest.fn().mockResolvedValue({ data: action ?? null, error: fetchError });
  const selectEq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq: selectEq });

  const updateEq = jest.fn().mockResolvedValue({ error: updateError });
  const update = jest.fn().mockReturnValue({ eq: updateEq });

  return {
    select,
    update,
    from: jest.fn().mockReturnValue({ select, update }),
  };
}

describe("POST /api/dashboard/actions/[actionId]/dismiss", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json(
        { error: "You must be signed in to dismiss actions." },
        { status: 401 },
      ),
    });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("You must be signed in to dismiss actions.");
  });

  it("returns 404 when action does not exist", async () => {
    const supabase = mockSupabase({ action: null });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const { request, params } = makeRequest("nonexistent");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.code).toBe("ACTION_NOT_FOUND");
  });

  it("returns 403 when action belongs to a different user", async () => {
    const supabase = mockSupabase({
      action: { action_id: "action-1", user_id: "other-user" },
    });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });

    expect(response.status).toBe(403);
  });

  it("sets dismissed_at and returns 200 on success", async () => {
    const supabase = mockSupabase({
      action: { action_id: "action-1", user_id: "user-1" },
    });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("client_actions");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ dismissed_at: expect.any(String) }),
    );
  });

  it("returns 500 with ACTION_DISMISS_FAILED when update fails", async () => {
    const supabase = mockSupabase({
      action: { action_id: "action-1", user_id: "user-1" },
      updateError: { message: "db error" },
    });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("ACTION_DISMISS_FAILED");
  });
});
