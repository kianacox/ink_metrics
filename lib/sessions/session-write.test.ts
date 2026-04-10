import { parseSessionCreatePayload } from "./session-write";

describe("parseSessionCreatePayload", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("accepts a valid existing-client payload", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "alice@example.com",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "2026-04-09T10:30:00.000Z",
      throughAds: true,
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
      throughAds: true,
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
      throughAds: null,
    });

    expect(result.error).toBe("Session date and time is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects future session date and time values", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "2026-04-09T11:30:00.000Z",
      throughAds: false,
    });

    expect(result.error).toBe("Session date and time cannot be in the future.");
    expect(result.data).toBeNull();
  });

  it("rejects throughAds when it is not a boolean or null", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDurationMinutes: 90,
      sessionAtIso: "2026-04-09T10:30:00.000Z",
      throughAds: "yes",
    });

    expect(result.error).toBe("Advertising selection is invalid.");
    expect(result.data).toBeNull();
  });
});
