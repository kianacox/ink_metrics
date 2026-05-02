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

type MockSupabase = {
  from: jest.Mock;
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildSupabaseMock({
  count = 0,
  insertError = null,
  countError = null,
}: {
  count?: number;
  insertError?: { message: string } | null;
  countError?: { message: string } | null;
} = {}): MockSupabase {
  const insertMock = jest.fn().mockResolvedValue({ error: insertError });
  const gteMock = jest.fn().mockResolvedValue({ count, error: countError });
  const eqMock = jest.fn(() => ({ gte: gteMock }));
  const selectMock = jest.fn(() => ({ eq: eqMock }));
  const fromMock = jest.fn((table: string) => {
    if (table !== "feedback") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: selectMock,
      insert: insertMock,
    };
  });
  return { from: fromMock };
}

const VALID_BODY = {
  category: "Feature request",
  message: "It would be great if expenses supported recurring entries.",
};

describe("POST /api/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json(
        { error: "You must be signed in to submit feedback." },
        { status: 401 },
      ),
    });

    const response = await POST(makeRequest(VALID_BODY));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("You must be signed in to submit feedback.");
  });

  it("returns 400 when a required field is missing", async () => {
    const supabase = buildSupabaseMock();
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await POST(
      makeRequest({ category: "Feature request", message: "" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("FEEDBACK_MISSING_FIELDS");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns 400 when category is not in the allow-list", async () => {
    const supabase = buildSupabaseMock();
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await POST(
      makeRequest({ ...VALID_BODY, category: "Spam" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("FEEDBACK_INVALID_CATEGORY");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const supabase = buildSupabaseMock();
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const request = new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("FEEDBACK_INVALID_BODY");
  });

  it("returns 429 when the user has hit the rate limit", async () => {
    const supabase = buildSupabaseMock({ count: 10 });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await POST(makeRequest(VALID_BODY));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe("FEEDBACK_RATE_LIMITED");
  });

  it("returns 500 when the rate-limit count query fails", async () => {
    const supabase = buildSupabaseMock({
      countError: { message: "boom" },
    });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await POST(makeRequest(VALID_BODY));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("FEEDBACK_RATE_CHECK_FAILED");
  });

  it("returns 500 when the insert fails", async () => {
    const supabase = buildSupabaseMock({
      insertError: { message: "insert failed" },
    });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-1" } as never,
      errorResponse: null,
    });

    const response = await POST(makeRequest(VALID_BODY));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("FEEDBACK_INSERT_FAILED");
  });

  it("inserts a row scoped to the authenticated user on a valid submission", async () => {
    const supabase = buildSupabaseMock({ count: 0 });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-2" } as never,
      errorResponse: null,
    });

    const response = await POST(makeRequest(VALID_BODY));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    // Find the call to insert and assert payload has the user id and trimmed values.
    const fromCalls = supabase.from.mock.results;
    const insertCall = fromCalls
      .map((r) => r.value as { insert: jest.Mock })
      .find((v) => v.insert.mock.calls.length > 0);
    expect(insertCall?.insert).toHaveBeenCalledWith({
      user_id: "user-2",
      category: "Feature request",
      message: VALID_BODY.message,
    });
  });

  it("trims category and message before insert", async () => {
    const supabase = buildSupabaseMock({ count: 0 });
    mockedAuth.mockResolvedValue({
      supabase: supabase as never,
      user: { id: "user-3" } as never,
      errorResponse: null,
    });

    const response = await POST(
      makeRequest({
        category: "Bug report",
        message: "  has surrounding whitespace  ",
      }),
    );

    expect(response.status).toBe(200);
    const insertCall = supabase.from.mock.results
      .map((r) => r.value as { insert: jest.Mock })
      .find((v) => v.insert.mock.calls.length > 0);
    expect(insertCall?.insert).toHaveBeenCalledWith({
      user_id: "user-3",
      category: "Bug report",
      message: "has surrounding whitespace",
    });
  });
});
