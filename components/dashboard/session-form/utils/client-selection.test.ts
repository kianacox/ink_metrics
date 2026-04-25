import {
  getFilteredClients,
  isDuplicateClientName,
  normalizeClientName,
} from "./client-selection";
import type { ClientOption } from "../models";

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
});
