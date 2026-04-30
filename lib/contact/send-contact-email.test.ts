/**
 * @jest-environment node
 */

const sendMock = jest.fn();

jest.mock("resend", () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: (...args: unknown[]) => sendMock(...args),
      },
    })),
  };
});

describe("sendContactEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "test-key";
  });

  it("sends an email to support@inkmetrics.app with the correct content", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "abc" }, error: null });

    const { sendContactEmail } = await import("./send-contact-email");

    await sendContactEmail({
      name: "Jane Doe",
      email: "jane@example.com",
      subject: "Billing",
      message: "Help me with billing.",
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toBe("inkMetrics <noreply@inkmetrics.app>");
    expect(payload.to).toBe("support@inkmetrics.app");
    expect(payload.replyTo).toBe("jane@example.com");
    expect(payload.subject).toBe("[Contact] Billing — from Jane Doe");
    expect(payload.text).toContain("Name: Jane Doe");
    expect(payload.text).toContain("Email: jane@example.com");
    expect(payload.text).toContain("Subject: Billing");
    expect(payload.text).toContain("Help me with billing.");
  });

  it("throws when Resend returns an error", async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "Invalid recipient" },
    });

    const { sendContactEmail } = await import("./send-contact-email");

    await expect(
      sendContactEmail({
        name: "Jane",
        email: "jane@example.com",
        subject: "Bug",
        message: "Broken",
      }),
    ).rejects.toThrow("Invalid recipient");
  });
});
