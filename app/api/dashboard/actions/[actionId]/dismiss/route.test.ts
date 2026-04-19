/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { POST } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { dismissAction, fetchActionOwner } from "@/lib/actions/action-db";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

jest.mock("@/lib/actions/action-db", () => ({
  fetchActionOwner: jest.fn(),
  dismissAction: jest.fn(),
}));

const mockedAuth = jest.mocked(requireAuthenticatedApiUser);
const mockedFetchActionOwner = jest.mocked(fetchActionOwner);
const mockedDismissAction = jest.mocked(dismissAction);

function makeRequest(actionId: string) {
  return {
    request: new Request(`http://localhost/api/dashboard/actions/${actionId}/dismiss`, {
      method: "POST",
    }),
    params: Promise.resolve({ actionId }),
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
    expect(mockedFetchActionOwner).not.toHaveBeenCalled();
  });

  it("returns 404 when action does not exist", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchActionOwner.mockResolvedValue({ error: "Action not found." });

    const { request, params } = makeRequest("nonexistent");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.code).toBe("ACTION_NOT_FOUND");
  });

  it("returns 403 when action belongs to a different user", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchActionOwner.mockResolvedValue({ userId: "other-user" });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe("ACTION_FORBIDDEN");
    expect(mockedDismissAction).not.toHaveBeenCalled();
  });

  it("calls dismissAction and returns 200 on success", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchActionOwner.mockResolvedValue({ userId: "user-1" });
    mockedDismissAction.mockResolvedValue({ dismissed: true });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockedDismissAction).toHaveBeenCalledWith({}, "action-1", "user-1");
  });

  it("returns 500 with ACTION_DISMISS_FAILED when dismissAction fails", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedFetchActionOwner.mockResolvedValue({ userId: "user-1" });
    mockedDismissAction.mockResolvedValue({ error: "Could not dismiss action." });

    const { request, params } = makeRequest("action-1");
    const response = await POST(request, { params });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("ACTION_DISMISS_FAILED");
  });
});
