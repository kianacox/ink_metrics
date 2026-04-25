/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { POST } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { parseSessionCreatePayload } from "@/lib/sessions/session-write";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

jest.mock("@/lib/sessions/session-write", () => ({
  ...jest.requireActual("@/lib/sessions/session-write"),
  parseSessionCreatePayload: jest.fn(),
}));

const mockedRequireAuth = jest.mocked(requireAuthenticatedApiUser);
const mockedParsePayload = jest.mocked(parseSessionCreatePayload);

const VALID_PARSED_PAYLOAD = {
  selectedClientId: "client-abc",
  createNewClient: false as const,
  clientName: "",
  clientContact: "",
  priceMinor: 15000,
  sessionDate: "2026-04-15",
  throughAds: null,
  inProgress: false,
};

function makeRequest(body: unknown = {}) {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthenticatedUser(rpc: jest.Mock) {
  mockedRequireAuth.mockResolvedValue({
    supabase: { rpc } as never,
    user: { id: "user-1" } as never,
    errorResponse: null,
  });
}

describe("POST /api/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns auth error response when unauthenticated", async () => {
    mockedRequireAuth.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json(
        { error: "You must be signed in to log a session." },
        { status: 401 },
      ),
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 400 when payload validation fails", async () => {
    mockAuthenticatedUser(jest.fn());
    mockedParsePayload.mockReturnValue({ data: null, error: "Session date is invalid." });

    const response = await POST(makeRequest({ sessionDate: "not-a-date" }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Session date is invalid.");
  });

  it("passes session date as YYYY-MM-DD string to the RPC", async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: [{ session_id: "sess-1", created_client_id: null, created_client_name: null }],
      error: null,
    });
    mockAuthenticatedUser(mockRpc);
    mockedParsePayload.mockReturnValue({ data: VALID_PARSED_PAYLOAD, error: null });

    await POST(makeRequest());

    expect(mockRpc).toHaveBeenCalledWith(
      "create_session_with_optional_client",
      expect.objectContaining({ p_session_at: "2026-04-15" }),
    );
  });

  it("returns 409 when no compensation version is active for the session date", async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "No compensation settings are active for this session date." },
    });
    mockAuthenticatedUser(mockRpc);
    mockedParsePayload.mockReturnValue({ data: VALID_PARSED_PAYLOAD, error: null });

    const response = await POST(makeRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("No compensation settings are active for this session date.");
  });

  it("returns 200 with null client for sessions linked to an existing client", async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: [{ session_id: "sess-1", created_client_id: null, created_client_name: null }],
      error: null,
    });
    mockAuthenticatedUser(mockRpc);
    mockedParsePayload.mockReturnValue({ data: VALID_PARSED_PAYLOAD, error: null });

    const response = await POST(makeRequest());
    const body = await response.json() as { success: boolean; client: null };

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, client: null });
  });

  it("returns created client info when a new client is created alongside the session", async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: [{
        session_id: "sess-2",
        created_client_id: "new-client-id",
        created_client_name: "Alex Smith",
      }],
      error: null,
    });
    mockAuthenticatedUser(mockRpc);
    mockedParsePayload.mockReturnValue({
      data: { ...VALID_PARSED_PAYLOAD, createNewClient: true, clientName: "Alex Smith", selectedClientId: null },
      error: null,
    });

    const response = await POST(makeRequest());
    const body = await response.json() as { success: boolean; client: { client_id: string; name: string } };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      client: { client_id: "new-client-id", name: "Alex Smith" },
    });
  });

  it("returns 400 with stable error code on unexpected RPC failure", async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "unexpected db error" },
    });
    mockAuthenticatedUser(mockRpc);
    mockedParsePayload.mockReturnValue({ data: VALID_PARSED_PAYLOAD, error: null });

    const response = await POST(makeRequest());
    const body = await response.json() as { error: string; code: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Could not create session.");
    expect(body.code).toBe("SESSION_CREATE_FAILED");
  });
});
