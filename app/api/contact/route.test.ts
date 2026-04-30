/**
 * @jest-environment node
 */
import { POST } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendContactEmail } from "@/lib/contact/send-contact-email";

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/lib/contact/send-contact-email", () => ({
  sendContactEmail: jest.fn(),
}));

const mockedCreateAdminClient = jest.mocked(createAdminClient);
const mockedSendContactEmail = jest.mocked(sendContactEmail);

type MockSupabase = {
  from: jest.Mock;
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
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
  const gteMock = jest
    .fn()
    .mockResolvedValue({ count, error: countError });
  const eqMock = jest.fn(() => ({ gte: gteMock }));
  const selectMock = jest.fn(() => ({ eq: eqMock }));
  const fromMock = jest.fn((table: string) => {
    if (table !== "contact_submissions") {
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
  name: "Jane Doe",
  email: "jane@example.com",
  subject: "Billing",
  message: "Need help with my plan.",
};

describe("POST /api/contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when a required field is missing", async () => {
    const supabase = buildSupabaseMock();
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const response = await POST(makeRequest({ ...VALID_BODY, name: "" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("CONTACT_MISSING_FIELDS");
    expect(mockedSendContactEmail).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns 400 when subject is not in the allow-list", async () => {
    const supabase = buildSupabaseMock();
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const response = await POST(
      makeRequest({ ...VALID_BODY, subject: "Spam" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("CONTACT_INVALID_SUBJECT");
    expect(mockedSendContactEmail).not.toHaveBeenCalled();
  });

  it("returns 429 when the IP has hit the rate limit", async () => {
    const supabase = buildSupabaseMock({ count: 5 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const response = await POST(
      makeRequest(VALID_BODY, { "x-forwarded-for": "10.0.0.1" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.code).toBe("CONTACT_RATE_LIMITED");
    expect(mockedSendContactEmail).not.toHaveBeenCalled();
  });

  it("sends the email and inserts a row on a valid submission", async () => {
    const supabase = buildSupabaseMock({ count: 0 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);
    mockedSendContactEmail.mockResolvedValue();

    const response = await POST(
      makeRequest(VALID_BODY, { "x-forwarded-for": "10.0.0.1, 192.168.0.1" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockedSendContactEmail).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@example.com",
      subject: "Billing",
      message: "Need help with my plan.",
    });
    expect(supabase.from).toHaveBeenCalledWith("contact_submissions");
    // first call: select for rate limit; second call: insert
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when sending fails", async () => {
    const supabase = buildSupabaseMock({ count: 0 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);
    mockedSendContactEmail.mockRejectedValue(new Error("SMTP error"));

    const response = await POST(makeRequest(VALID_BODY));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.code).toBe("CONTACT_SEND_FAILED");
  });
});
