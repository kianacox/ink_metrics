import { validateSessionForm } from "./session-form-validation";
import type { ClientOption } from "./client-selection";

const clients: ClientOption[] = [
  { client_id: "client-1", name: "Alice Doe" },
  { client_id: "client-2", name: "Bob Stone" },
];

describe("validateSessionForm", () => {
  it("fails when neither existing nor new client path is selected", () => {
    const result = validateSessionForm({
      selectedClientId: null,
      createNewClient: false,
      clientName: "Alice Doe",
      hours: "1",
      minutes: "0",
      profit: "100",
      sessionAtLocal: "2026-04-08T10:30",
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
      hours: "1",
      minutes: "0",
      profit: "100",
      sessionAtLocal: "2026-04-08T10:30",
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
      hours: "1",
      minutes: "0",
      profit: "100",
      sessionAtLocal: "2026-04-08T10:30",
      reportingTimezone: "UTC",
      clients,
    });

    expect(result).toEqual({
      valid: false,
      errorMessage:
        "A client with this name already exists. Choose it from Existing client.",
    });
  });

  it("fails with invalid duration", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      hours: "-1",
      minutes: "0",
      profit: "100",
      sessionAtLocal: "2026-04-08T10:30",
      reportingTimezone: "UTC",
      clients,
    });

    expect(result).toEqual({
      valid: false,
      errorMessage: "Hours must be a whole number of zero or greater.",
    });
  });

  it("fails with invalid profit", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      hours: "1",
      minutes: "30",
      profit: "abc",
      sessionAtLocal: "2026-04-08T10:30",
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
      hours: "1",
      minutes: "30",
      profit: "12.34",
      sessionAtLocal: "2026-04-08T10:30",
      reportingTimezone: "UTC",
      clients,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalizedClientName).toBe("Alice Doe");
      expect(result.sessionDurationMinutes).toBe(90);
      expect(result.priceMinor).toBe(1234);
      expect(result.sessionAtIso).toBe("2026-04-08T10:30:00.000Z");
    }
  });

  it("fails when session date and time is missing", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      hours: "1",
      minutes: "30",
      profit: "12.34",
      sessionAtLocal: " ",
      reportingTimezone: "UTC",
      clients,
    });

    expect(result).toEqual({
      valid: false,
      errorMessage: "Session date and time are required.",
    });
  });

  it("fails when reporting timezone is invalid", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      hours: "1",
      minutes: "30",
      profit: "12.34",
      sessionAtLocal: "2026-04-08T10:30",
      reportingTimezone: "Mars/Phobos",
      clients,
    });

    expect(result).toEqual({
      valid: false,
      errorMessage: "Reporting timezone is invalid.",
    });
  });

  it("fails for nonexistent local wall-time during DST transition", () => {
    const result = validateSessionForm({
      selectedClientId: "client-1",
      createNewClient: false,
      clientName: "Alice Doe",
      hours: "1",
      minutes: "30",
      profit: "12.34",
      sessionAtLocal: "2026-03-29T01:30",
      reportingTimezone: "Europe/London",
      clients,
    });

    expect(result).toEqual({
      valid: false,
      errorMessage: "Session date and time is invalid.",
    });
  });
});
