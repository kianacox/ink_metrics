import { mapSessionCreateRpcError } from "./session-rpc-error";

describe("mapSessionCreateRpcError", () => {
  it("returns 409 with the user-safe message for duplicate-name conflict", () => {
    expect(
      mapSessionCreateRpcError(
        "A client with this name already exists. Choose it from Existing client.",
      ),
    ).toEqual({
      status: 409,
      code: "SESSION_CREATE_VALIDATION_FAILED",
      message: "A client with this name already exists. Choose it from Existing client.",
    });
  });

  it("returns 409 with the user-safe message for missing compensation settings", () => {
    expect(
      mapSessionCreateRpcError("No compensation settings are active for this session date."),
    ).toEqual({
      status: 409,
      code: "SESSION_CREATE_VALIDATION_FAILED",
      message: "No compensation settings are active for this session date.",
    });
  });

  it.each([
    "You must be signed in to log a session.",
    "Select an existing client before saving.",
    "Selected client was not found.",
    "Client name is required for a new client.",
  ])("returns 400 with the user-safe message for %s", (rpcMessage) => {
    expect(mapSessionCreateRpcError(rpcMessage)).toEqual({
      status: 400,
      code: "SESSION_CREATE_VALIDATION_FAILED",
      message: rpcMessage,
    });
  });

  it("returns 400 with a generic message for any other RPC error", () => {
    expect(mapSessionCreateRpcError("Unexpected database failure")).toEqual({
      status: 400,
      code: "SESSION_CREATE_FAILED",
      message: "Could not create session.",
    });
  });
});
