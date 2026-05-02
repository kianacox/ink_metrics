import type { ClientSortField } from "@/lib/clients/models";
import type { ClientTier } from "@/lib/clients/tier";
import type { SessionDateRangePreset } from "@/lib/timezones";

/**
 * Whitelisted clients-list query parameter values, plus parsing helpers.
 *
 * Centralising these keeps the API route handler focused on transport
 * concerns (auth, parsing the URL, returning a response) and makes the
 * accepted values directly testable without spinning up an HTTP request.
 */

export const CLIENT_VALID_SORT_FIELDS: ReadonlySet<ClientSortField> = new Set<ClientSortField>([
  "session_count",
  "total_value",
]);

export const CLIENT_VALID_DATE_RANGES: ReadonlySet<SessionDateRangePreset> =
  new Set<SessionDateRangePreset>([
    "thisMonth",
    "last30Days",
    "last90Days",
    "yearToDate",
    "allTime",
  ]);

export const CLIENT_VALID_TIERS: ReadonlySet<ClientTier> = new Set<ClientTier>([
  "vip",
  "regular",
  "one-timer",
]);

const DEFAULT_CLIENT_SORT_FIELD: ClientSortField = "session_count";
const DEFAULT_CLIENT_DATE_RANGE: SessionDateRangePreset = "last90Days";

const DUPLICATE_CLIENT_NAME_MESSAGE = "A client with this name already exists.";

export function isValidClientSortField(value: unknown): value is ClientSortField {
  return typeof value === "string" && CLIENT_VALID_SORT_FIELDS.has(value as ClientSortField);
}

export function isValidClientDateRange(value: unknown): value is SessionDateRangePreset {
  return (
    typeof value === "string" && CLIENT_VALID_DATE_RANGES.has(value as SessionDateRangePreset)
  );
}

export function isValidClientTier(value: unknown): value is ClientTier {
  return typeof value === "string" && CLIENT_VALID_TIERS.has(value as ClientTier);
}

export function parseClientSortField(value: string | null): ClientSortField {
  return isValidClientSortField(value) ? value : DEFAULT_CLIENT_SORT_FIELD;
}

export function parseClientDateRange(value: string | null): SessionDateRangePreset {
  return isValidClientDateRange(value) ? value : DEFAULT_CLIENT_DATE_RANGE;
}

export interface ParsedClientTier {
  data: ClientTier | null;
  error: string | null;
}

export function parseClientTier(value: string | null): ParsedClientTier {
  if (value === null) {
    return { data: null, error: null };
  }
  if (!isValidClientTier(value)) {
    return { data: null, error: `Invalid tier: ${value}` };
  }
  return { data: value, error: null };
}

export interface ClientCreateRpcErrorMapping {
  status: number;
  code: string;
  message: string;
}

/**
 * Maps an RPC error from `create_client` to the user-facing HTTP response shape.
 *
 * Duplicate-name conflicts are surfaced as 409 with the original RPC message;
 * any other failure returns 400 with a generic "Could not create client." message.
 */
export function parseClientCreateRpcError(rpcMessage: string): ClientCreateRpcErrorMapping {
  if (rpcMessage === DUPLICATE_CLIENT_NAME_MESSAGE) {
    return {
      status: 409,
      code: "CLIENT_ALREADY_EXISTS",
      message: rpcMessage,
    };
  }
  return {
    status: 400,
    code: "CLIENT_CREATE_FAILED",
    message: "Could not create client.",
  };
}
