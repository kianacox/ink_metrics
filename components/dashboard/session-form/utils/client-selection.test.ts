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

describe("client-selection utils", () => {
  it("filters existing clients only after first character", () => {
    expect(getFilteredClients(clients, "")).toEqual([]);
    expect(getFilteredClients(clients, " ")).toEqual([]);

    expect(getFilteredClients(clients, "a")).toEqual([
      { client_id: "1", name: "Alice Doe" },
    ]);
  });

  it("normalizes and checks duplicate client names", () => {
    expect(normalizeClientName("  New Client  ")).toBe("New Client");
    expect(isDuplicateClientName(clients, "alice doe")).toBe(true);
    expect(isDuplicateClientName(clients, "  Bob Stone ")).toBe(true);
    expect(isDuplicateClientName(clients, "Charlie")).toBe(false);
  });

  it("validates hours and minutes duration inputs", () => {
    expect(validateDuration("1", "30")).toEqual({
      valid: true,
      totalMinutes: 90,
      errorMessage: "",
    });

    expect(validateDuration("-1", "0").valid).toBe(false);
    expect(validateDuration("0", "60").valid).toBe(false);
    expect(validateDuration("0", "0").valid).toBe(false);
    expect(validateDuration("abc", "10").valid).toBe(false);
    expect(validateDuration("2", "x").valid).toBe(false);
  });
});
