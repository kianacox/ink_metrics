/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { GET } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { computeAndUpsertActions } from "@/lib/actions/compute-and-upsert-actions";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

jest.mock("@/lib/actions/compute-and-upsert-actions", () => ({
  computeAndUpsertActions: jest.fn(),
}));

const mockedAuth = jest.mocked(requireAuthenticatedApiUser);
const mockedComputeAndUpsert = jest.mocked(computeAndUpsertActions);

const MOCK_ACTION = {
  actionId: "action-1",
  clientId: "client-1",
  clientName: "Alice",
  actionType: "lapsed_repeat" as const,
  weeksSince: 9,
  revenueAtRiskMinor: 12000,
  messageTemplate: "Hey Alice! It's been a while...",
};

describe("GET /api/dashboard/actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json(
        { error: "You must be signed in to view actions." },
        { status: 401 },
      ),
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("You must be signed in to view actions.");
    expect(mockedComputeAndUpsert).not.toHaveBeenCalled();
  });

  it("returns active actions for authenticated user", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockResolvedValue([MOCK_ACTION]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.actions).toHaveLength(1);
    expect(payload.actions[0]).toEqual(MOCK_ACTION);
    expect(mockedComputeAndUpsert).toHaveBeenCalledWith({}, "user-1");
  });

  it("scopes query to the authenticated user — never leaks another user's actions", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-2" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockResolvedValue([]);

    await GET();

    expect(mockedComputeAndUpsert).toHaveBeenCalledWith({}, "user-2");
    expect(mockedComputeAndUpsert).not.toHaveBeenCalledWith({}, "user-1");
  });

  it("returns empty actions array when no signals", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockResolvedValue([]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.actions).toEqual([]);
  });

  it("returns 500 with ACTIONS_UPSERT_FAILED on upsert error", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockRejectedValue(new Error("ACTIONS_UPSERT_FAILED"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("ACTIONS_UPSERT_FAILED");
    expect(payload.error).toBe("Could not load actions.");
  });

  it("returns 500 with ACTIONS_FETCH_FAILED on fetch error", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockRejectedValue(new Error("ACTIONS_FETCH_FAILED"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("ACTIONS_FETCH_FAILED");
  });

  it("returns ACTIONS_FETCH_FAILED for unexpected errors", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockRejectedValue(new Error("something unexpected"));

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("ACTIONS_FETCH_FAILED");
  });

  it("response shape matches contract for each action type", async () => {
    const actions = [
      { ...MOCK_ACTION, actionType: "lapsed_repeat" as const },
      { ...MOCK_ACTION, actionId: "action-2", actionType: "new_client" as const },
      { ...MOCK_ACTION, actionId: "action-3", actionType: "in_progress" as const },
    ];
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });
    mockedComputeAndUpsert.mockResolvedValue(actions);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    for (const action of payload.actions) {
      expect(action).toMatchObject({
        actionId: expect.any(String),
        clientId: expect.any(String),
        clientName: expect.any(String),
        actionType: expect.stringMatching(/^(lapsed_repeat|new_client|in_progress)$/),
        weeksSince: expect.any(Number),
        revenueAtRiskMinor: expect.any(Number),
        messageTemplate: expect.any(String),
      });
    }
  });
});
