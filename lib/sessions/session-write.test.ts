import { parseSessionCreatePayload, parseSessionUpdatePayload } from "./session-write";

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

describe("parseSessionUpdatePayload", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("accepts a valid update payload", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDurationMinutes: 120,
      sessionAtIso: "2026-04-09T10:00:00.000Z",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      priceMinor: 12_500,
      sessionDurationMinutes: 120,
      sessionAtIso: "2026-04-09T10:00:00.000Z",
    });
  });

  it("rejects payloads that include non-editable fields", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDurationMinutes: 120,
      sessionAtIso: "2026-04-09T10:00:00.000Z",
      clientId: "client-1",
    });

    expect(result.error).toBe("Only price, session duration, and session date/time can be updated.");
    expect(result.data).toBeNull();
  });

  it("rejects invalid duration", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDurationMinutes: 0,
      sessionAtIso: "2026-04-09T10:00:00.000Z",
    });

    expect(result.error).toBe("Session duration is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects future session date and time", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDurationMinutes: 120,
      sessionAtIso: "2026-04-09T11:00:00.000Z",
    });

    expect(result.error).toBe("Session date and time cannot be in the future.");
    expect(result.data).toBeNull();
  });
});
