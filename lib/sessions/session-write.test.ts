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
      sessionDate: "2026-04-09",
      throughAds: true,
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "alice@example.com",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      throughAds: true,
      inProgress: false,
    });
  });

  it("accepts inProgress true and preserves it in output", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      throughAds: null,
      inProgress: true,
    });

    expect(result.error).toBeNull();
    expect(result.data?.inProgress).toBe(true);
  });

  it("defaults inProgress to false when omitted", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
    });

    expect(result.data?.inProgress).toBe(false);
  });

  it("rejects inProgress when it is not a boolean or null", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      inProgress: "yes",
    });

    expect(result.error).toBe("Follow-up status is invalid.");
    expect(result.data).toBeNull();
  });

  it("requires a client selection when not creating a new client", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: null,
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
    });

    expect(result.error).toBe("Select an existing client or create a new one before saving.");
    expect(result.data).toBeNull();
  });

  it("requires a valid sessionDate value", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "not-a-date",
      throughAds: null,
    });

    expect(result.error).toBe("Session date is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects missing sessionDate", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      throughAds: null,
    });

    expect(result.error).toBe("Session date is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects malformed date string (ISO timestamp instead of date)", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09T10:30:00.000Z",
      throughAds: null,
    });

    expect(result.error).toBe("Session date is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects future session date", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-10",
      throughAds: false,
    });

    expect(result.error).toBe("Session date cannot be in the future.");
    expect(result.data).toBeNull();
  });

  it("rejects date more than 6 months in the past", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2025-10-08",
      throughAds: false,
    });

    expect(result.error).toBe("Session date cannot be more than 6 months in the past.");
    expect(result.data).toBeNull();
  });

  it("accepts today's date", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
      throughAds: null,
    });

    expect(result.error).toBeNull();
    expect(result.data?.sessionDate).toBe("2026-04-09");
  });

  it("rejects throughAds when it is not a boolean or null", () => {
    const result = parseSessionCreatePayload({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "",
      clientContact: "",
      priceMinor: 5000,
      sessionDate: "2026-04-09",
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
      sessionDate: "2026-04-09",
      inProgress: false,
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      priceMinor: 12_500,
      sessionDate: "2026-04-09",
      inProgress: false,
    });
  });

  it("accepts inProgress true in update payload", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2026-04-09",
      inProgress: true,
    });

    expect(result.error).toBeNull();
    expect(result.data?.inProgress).toBe(true);
  });

  it("defaults inProgress to false when omitted from update payload", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2026-04-09",
    });

    expect(result.error).toBeNull();
    expect(result.data?.inProgress).toBe(false);
  });

  it("rejects inProgress when it is not a boolean in update payload", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2026-04-09",
      inProgress: "yes",
    });

    expect(result.error).toBe("Follow-up status is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects payloads that include non-editable fields", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2026-04-09",
      clientId: "client-1",
    });

    expect(result.error).toBe(
      "Only price, session date, and follow-up status can be updated.",
    );
    expect(result.data).toBeNull();
  });

  it("rejects payloads with sessionDurationMinutes (removed field)", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2026-04-09",
      sessionDurationMinutes: 90,
    });

    expect(result.error).toBe(
      "Only price, session date, and follow-up status can be updated.",
    );
    expect(result.data).toBeNull();
  });

  it("rejects missing sessionDate", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
    });

    expect(result.error).toBe("Session date is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects future session date", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2026-04-10",
    });

    expect(result.error).toBe("Session date cannot be in the future.");
    expect(result.data).toBeNull();
  });

  it("rejects date more than 6 months in the past", () => {
    const result = parseSessionUpdatePayload({
      priceMinor: 12_500,
      sessionDate: "2025-10-08",
    });

    expect(result.error).toBe("Session date cannot be more than 6 months in the past.");
    expect(result.data).toBeNull();
  });
});
