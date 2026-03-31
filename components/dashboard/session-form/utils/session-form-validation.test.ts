import assert from "node:assert/strict";
import test from "node:test";
import { validateSessionForm } from "./session-form-validation";
import type { ClientOption } from "./client-selection";

const clients: ClientOption[] = [
  { client_id: "client-1", name: "Alice Doe" },
  { client_id: "client-2", name: "Bob Stone" },
];

test("fails when neither existing nor new client path is selected", () => {
  const result = validateSessionForm({
    selectedClientId: null,
    createNewClient: false,
    clientName: "Alice Doe",
    hours: "1",
    minutes: "0",
    profit: "100",
    clients,
  });

  assert.deepEqual(result, {
    valid: false,
    errorMessage: "Select an existing client or create a new one before saving.",
  });
});

test("fails when creating a new client without a name", () => {
  const result = validateSessionForm({
    selectedClientId: null,
    createNewClient: true,
    clientName: "   ",
    hours: "1",
    minutes: "0",
    profit: "100",
    clients,
  });

  assert.deepEqual(result, {
    valid: false,
    errorMessage: "Client name is required for a new client.",
  });
});

test("fails when creating duplicate client", () => {
  const result = validateSessionForm({
    selectedClientId: null,
    createNewClient: true,
    clientName: " alice doe ",
    hours: "1",
    minutes: "0",
    profit: "100",
    clients,
  });

  assert.deepEqual(result, {
    valid: false,
    errorMessage: "A client with this name already exists. Choose it from Existing client.",
  });
});

test("fails with invalid duration", () => {
  const result = validateSessionForm({
    selectedClientId: "client-1",
    createNewClient: false,
    clientName: "Alice Doe",
    hours: "-1",
    minutes: "0",
    profit: "100",
    clients,
  });

  assert.deepEqual(result, {
    valid: false,
    errorMessage: "Hours must be a whole number of zero or greater.",
  });
});

test("fails with invalid profit", () => {
  const result = validateSessionForm({
    selectedClientId: "client-1",
    createNewClient: false,
    clientName: "Alice Doe",
    hours: "1",
    minutes: "30",
    profit: "abc",
    clients,
  });

  assert.deepEqual(result, {
    valid: false,
    errorMessage: "Profit must be a valid number.",
  });
});

test("returns normalized values for valid existing-client form", () => {
  const result = validateSessionForm({
    selectedClientId: "client-1",
    createNewClient: false,
    clientName: " Alice Doe ",
    hours: "1",
    minutes: "30",
    profit: "12.34",
    clients,
  });

  assert.deepEqual(result, {
    valid: true,
    normalizedClientName: "Alice Doe",
    sessionDurationMinutes: 90,
    priceMinor: 1234,
  });
});
