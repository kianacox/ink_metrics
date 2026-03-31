import assert from "node:assert/strict";
import test from "node:test";
import {
  getFilteredClients,
  isDuplicateClientName,
  normalizeClientName,
  validateDuration,
  type ClientOption,
} from "./client-selection";

const clients: ClientOption[] = [
  { client_id: "1", name: "Alice Doe" },
  { client_id: "2", name: "Bob Stone" },
];

test("filters existing clients only after first character", () => {
  assert.deepEqual(getFilteredClients(clients, ""), []);
  assert.deepEqual(getFilteredClients(clients, " "), []);

  assert.deepEqual(getFilteredClients(clients, "a"), [
    { client_id: "1", name: "Alice Doe" },
  ]);
});

test("normalizes and checks duplicate client names", () => {
  assert.equal(normalizeClientName("  New Client  "), "New Client");
  assert.equal(isDuplicateClientName(clients, "alice doe"), true);
  assert.equal(isDuplicateClientName(clients, "  Bob Stone "), true);
  assert.equal(isDuplicateClientName(clients, "Charlie"), false);
});

test("validates hours and minutes duration inputs", () => {
  assert.deepEqual(validateDuration("1", "30"), {
    valid: true,
    totalMinutes: 90,
    errorMessage: "",
  });

  assert.equal(validateDuration("-1", "0").valid, false);
  assert.equal(validateDuration("0", "60").valid, false);
  assert.equal(validateDuration("0", "0").valid, false);
  assert.equal(validateDuration("abc", "10").valid, false);
  assert.equal(validateDuration("2", "x").valid, false);
});
