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
      clients,
    });

    expect(result).toEqual({
      valid: true,
      normalizedClientName: "Alice Doe",
      sessionDurationMinutes: 90,
      priceMinor: 1234,
    });
  });
});
