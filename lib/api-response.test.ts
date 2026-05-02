/**
 * @jest-environment node
 */
import { errorJson } from "./api-response";

describe("errorJson", () => {
  it("returns a NextResponse with the provided error, code, and status", async () => {
    const response = errorJson("Could not load expenses.", "EXPENSES_FETCH_FAILED", 500);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Could not load expenses.",
      code: "EXPENSES_FETCH_FAILED",
    });
  });

  it("supports 4xx statuses", async () => {
    const response = errorJson("Invalid cursor.", "SESSIONS_CURSOR_INVALID", 400);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "Invalid cursor.",
      code: "SESSIONS_CURSOR_INVALID",
    });
  });

  it("supports conflict statuses", async () => {
    const response = errorJson("Conflict", "CLIENT_ALREADY_EXISTS", 409);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      error: "Conflict",
      code: "CLIENT_ALREADY_EXISTS",
    });
  });
});
