import { parseClientCreatePayload, parseClientUpdatePayload } from "./client-write";

describe("parseClientCreatePayload", () => {
  it("accepts a valid payload with name and contact info", () => {
    const result = parseClientCreatePayload({ name: "Alice Smith", contactInfo: "alice@example.com" });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Alice Smith", contactInfo: "alice@example.com" });
  });

  it("accepts a payload with name only and empty contact info", () => {
    const result = parseClientCreatePayload({ name: "Bob Jones", contactInfo: "" });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Bob Jones", contactInfo: "" });
  });

  it("trims whitespace from name and contact info", () => {
    const result = parseClientCreatePayload({ name: "  Alice  ", contactInfo: "  alice@x.com  " });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Alice", contactInfo: "alice@x.com" });
  });

  it("rejects a payload with an empty name", () => {
    const result = parseClientCreatePayload({ name: "", contactInfo: "" });
    expect(result.error).toBe("Client name is required.");
    expect(result.data).toBeNull();
  });

  it("rejects a payload with a whitespace-only name", () => {
    const result = parseClientCreatePayload({ name: "   ", contactInfo: "" });
    expect(result.error).toBe("Client name is required.");
    expect(result.data).toBeNull();
  });

  it("rejects a non-object payload", () => {
    const result = parseClientCreatePayload("not an object");
    expect(result.error).toBe("Client payload is invalid.");
    expect(result.data).toBeNull();
  });

  it("rejects null", () => {
    const result = parseClientCreatePayload(null);
    expect(result.error).toBe("Client payload is invalid.");
    expect(result.data).toBeNull();
  });

  it("coerces missing contactInfo to empty string", () => {
    const result = parseClientCreatePayload({ name: "Charlie" });
    expect(result.error).toBeNull();
    expect(result.data?.contactInfo).toBe("");
  });
});

describe("parseClientUpdatePayload", () => {
  it("accepts a valid update payload", () => {
    const result = parseClientUpdatePayload({ name: "Alice", contactInfo: "new@example.com" });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Alice", contactInfo: "new@example.com" });
  });

  it("rejects an empty name", () => {
    const result = parseClientUpdatePayload({ name: "", contactInfo: "" });
    expect(result.error).toBe("Client name is required.");
    expect(result.data).toBeNull();
  });

  it("trims whitespace from both fields", () => {
    const result = parseClientUpdatePayload({ name: "  Dave  ", contactInfo: "  d@x.com  " });
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: "Dave", contactInfo: "d@x.com" });
  });

  it("rejects a non-object payload", () => {
    const result = parseClientUpdatePayload(42);
    expect(result.error).toBe("Client update payload is invalid.");
    expect(result.data).toBeNull();
  });
});
