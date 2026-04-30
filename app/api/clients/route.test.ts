/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { GET } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { fetchClientsPage } from "@/lib/clients/fetch-clients-page";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

jest.mock("@/lib/clients/fetch-clients-page", () => ({
  fetchClientsPage: jest.fn(),
}));

const mockedRequireAuthenticatedApiUser = jest.mocked(requireAuthenticatedApiUser);
const mockedFetchClientsPage = jest.mocked(fetchClientsPage);

function mockAuthenticated() {
  mockedRequireAuthenticatedApiUser.mockResolvedValue({
    supabase: {} as never,
    user: { id: "user-1" } as never,
    errorResponse: null,
  });
}

function mockSuccessfulFetch() {
  mockedFetchClientsPage.mockResolvedValue({
    data: [],
    hasNextPage: false,
    nextCursor: null,
  });
}

describe("GET /api/clients tier filter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns auth error when unauthenticated", async () => {
    mockedRequireAuthenticatedApiUser.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json(
        { error: "You must be signed in to list clients." },
        { status: 401 },
      ),
    });

    const response = await GET(new Request("http://localhost/api/clients"));
    expect(response.status).toBe(401);
  });

  it("forwards tier=vip to fetchClientsPage", async () => {
    mockAuthenticated();
    mockSuccessfulFetch();

    const response = await GET(new Request("http://localhost/api/clients?tier=vip"));

    expect(response.status).toBe(200);
    expect(mockedFetchClientsPage).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "vip" }),
    );
  });

  it("forwards tier=regular to fetchClientsPage", async () => {
    mockAuthenticated();
    mockSuccessfulFetch();

    await GET(new Request("http://localhost/api/clients?tier=regular"));

    expect(mockedFetchClientsPage).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "regular" }),
    );
  });

  it("forwards tier=one-timer to fetchClientsPage", async () => {
    mockAuthenticated();
    mockSuccessfulFetch();

    await GET(new Request("http://localhost/api/clients?tier=one-timer"));

    expect(mockedFetchClientsPage).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "one-timer" }),
    );
  });

  it("returns null tier when tier param is omitted", async () => {
    mockAuthenticated();
    mockSuccessfulFetch();

    await GET(new Request("http://localhost/api/clients"));

    expect(mockedFetchClientsPage).toHaveBeenCalledWith(
      expect.objectContaining({ tier: null }),
    );
  });

  it("returns 400 CLIENTS_INVALID_TIER for invalid tier value", async () => {
    mockAuthenticated();
    mockSuccessfulFetch();

    const response = await GET(
      new Request("http://localhost/api/clients?tier=bogus"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "Invalid tier: bogus",
      code: "CLIENTS_INVALID_TIER",
    });
    expect(mockedFetchClientsPage).not.toHaveBeenCalled();
  });
});
