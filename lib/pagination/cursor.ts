export interface CompositeCursor {
  sortValue: string | number;
  id: string;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export class CursorDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CursorDecodeError";
  }
}

function toBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function fromBase64(value: string): string {
  return Buffer.from(value, "base64").toString("utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function encodeCompositeCursor(cursor: CompositeCursor): string {
  return toBase64(JSON.stringify(cursor));
}

export function decodeCompositeCursor(cursorParam: string | null): CompositeCursor | null {
  if (!cursorParam) {
    return null;
  }

  try {
    const decoded = JSON.parse(fromBase64(cursorParam)) as unknown;
    if (!isRecord(decoded)) {
      throw new CursorDecodeError("Cursor payload must be an object.");
    }

    const { sortValue, id } = decoded;
    if (typeof id !== "string" || id.length === 0) {
      throw new CursorDecodeError("Cursor id must be a non-empty string.");
    }
    if (typeof sortValue !== "string" && typeof sortValue !== "number") {
      throw new CursorDecodeError("Cursor sortValue must be a string or number.");
    }

    return { sortValue, id };
  } catch (error) {
    if (error instanceof CursorDecodeError) {
      throw error;
    }
    throw new CursorDecodeError("Cursor must be valid base64-encoded JSON.");
  }
}
