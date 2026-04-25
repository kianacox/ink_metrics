import { validateEditableSessionFields, validateSessionForm } from "./session-form-validation";
import type { ClientOption } from "../models";

const clients: ClientOption[] = [
  { client_id: "client-1", name: "Alice Doe" },
  { client_id: "client-2", name: "Bob Stone" },
];

describe("validateEditableSessionFields", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });
  afterEach(() => { jest.useRealTimers(); });

  it("accepts valid date and price", () => {
    const result = validateEditableSessionFields({
      profit: "100.00",
      sessionDate: "2026-04-09",
      reportingTimezone: "Europe/London",
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.sessionDate).toBe("2026-04-09");
      expect(result.priceMinor).toBe(10000);
    }
  });

  it("rejects future date", () => {
    const result = validateEditableSessionFields({
      profit: "100.00",
      sessionDate: "2026-04-10",
      reportingTimezone: "Europe/London",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toMatch(/future/i);
  });

  it("rejects date more than 6 months in the past", () => {
    const result = validateEditableSessionFields({
      profit: "100.00",
      sessionDate: "2025-10-08",
      reportingTimezone: "Europe/London",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toMatch(/6 months/i);
  });

  it("rejects empty date", () => {
    const result = validateEditableSessionFields({
      profit: "100.00",
      sessionDate: "",
      reportingTimezone: "Europe/London",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid price", () => {
    const result = validateEditableSessionFields({
      profit: "abc",
      sessionDate: "2026-04-09",
      reportingTimezone: "Europe/London",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errorMessage).toMatch(/price/i);
  });
});

describe("validateSessionForm", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-04-09T10:30:00.000Z") });
  });
  afterEach(() => { jest.useRealTimers(); });

  it("fails when neither existing nor new client path is selected", () => {
    const result = validateSessionForm({
      selectedClientId: null,
      createNewClient: false,
      clientName: "Alice Doe",
      profit: "100",
      sessionDate: "2026-04-09",
      reportingTimezone: "UTC",
      clients,
    });
    expect(result).toEqual({
      valid: false,
      errorMessage: "Select an existing client or create a new one before saving.",
    });
  });

  it("fails when creating a new client without a name", () => {
    const result = validateSessionForm({
      selectedClientId: null,
      createNewClient: true,
      clientName: "   ",
      profit: "100",
      sessionDate: "2026-04-09",
      reportingTimezone: "UTC",
      clients,
    });
    expect(result).toEqual({
      valid: false,
      errorMessage: "Client name is required for a new client.",
    });
  });

  it("fails when creating duplicate client", () => {
    const result = validateSessionForm({
      selectedClientId: null,
      createNewClient: true,
      clientName: " alice doe ",
      profit: "100",
      sessionDate: "2026-04-09",
      reportingTimezone: "UTC",
      clients,
    });
    expect(result).toEqual({
      valid: false,
      errorMessage: "A client with this name already exists. Choose it from Existing client.",
    });
  });

  it("fails with invalid profit", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      profit: "abc",
      sessionDate: "2026-04-09",
      reportingTimezone: "UTC",
      clients,
    });
    expect(result).toEqual({
      valid: false,
      errorMessage: "Price must be a valid number.",
    });
  });

  it("returns normalized values for valid existing-client form", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: " Alice Doe ",
      profit: "12.34",
      sessionDate: "2026-04-09",
      reportingTimezone: "UTC",
      clients,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalizedClientName).toBe("Alice Doe");
      expect(result.sessionDate).toBe("2026-04-09");
      expect(result.priceMinor).toBe(1234);
    }
  });

  it("fails when session date is missing", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      profit: "12.34",
      sessionDate: "",
      reportingTimezone: "UTC",
      clients,
    });
    expect(result.valid).toBe(false);
  });
});
