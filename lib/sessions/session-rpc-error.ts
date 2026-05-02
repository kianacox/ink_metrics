/**
 * Maps RPC errors from `create_session_with_optional_client` to the
 * user-facing HTTP response shape (status, code, and message).
 *
 * The Postgres function raises a fixed catalogue of validation messages.
 * Conflict-class errors (duplicate name, missing compensation settings)
 * become 409. Other validation errors stay 400 but echo the RPC message
 * so the client can surface it. Any unrecognised error returns a generic
 * 400 with `Could not create session.` to avoid leaking internals.
 */

const CONFLICT_MESSAGES: ReadonlySet<string> = new Set<string>([
  "A client with this name already exists. Choose it from Existing client.",
  "No compensation settings are active for this session date.",
]);

const OTHER_USER_SAFE_MESSAGES: ReadonlySet<string> = new Set<string>([
  "You must be signed in to log a session.",
  "Select an existing client before saving.",
  "Selected client was not found.",
  "Client name is required for a new client.",
]);

export interface SessionCreateRpcErrorMapping {
  status: number;
  code: string;
  message: string;
}

export function mapSessionCreateRpcError(rpcMessage: string): SessionCreateRpcErrorMapping {
  if (CONFLICT_MESSAGES.has(rpcMessage)) {
    return {
      status: 409,
      code: "SESSION_CREATE_VALIDATION_FAILED",
      message: rpcMessage,
    };
  }
  if (OTHER_USER_SAFE_MESSAGES.has(rpcMessage)) {
    return {
      status: 400,
      code: "SESSION_CREATE_VALIDATION_FAILED",
      message: rpcMessage,
    };
  }
  return {
    status: 400,
    code: "SESSION_CREATE_FAILED",
    message: "Could not create session.",
  };
}
