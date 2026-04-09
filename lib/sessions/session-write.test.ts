import { parseSessionCreatePayload } from "./session-write";

describe("parseSessionCreatePayload", () => {
  it("accepts a valid existing-client payload", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "alice@example.com",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "2026-04-09T10:30:00.000Z",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "alice@example.com",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "2026-04-09T10:30:00.000Z",
    });
  });

  it("requires a client selection when not creating a new client", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: null,
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "2026-04-09T10:30:00.000Z",
    });

    expect(result.error).toBe("Select an existing client or create a new one before saving.");
    expect(result.data).toBeNull();
  });

  it("requires a valid session_at ISO value", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "not-a-date",
    });

    expect(result.error).toBe("Session date and time is invalid.");
    expect(result.data).toBeNull();
  });
});
