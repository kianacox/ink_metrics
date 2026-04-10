export interface SessionCreatePayload {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDurationMinutes: number;
  sessionAtIso: string;
  throughAds: boolean | null;
}

interface SessionCreatePayloadCandidate {
  selectedClientId?: unknown;
  createNewClient?: unknown;
  clientName?: unknown;
  clientContact?: unknown;
  priceMinor?: unknown;
  sessionDurationMinutes?: unknown;
  sessionAtIso?: unknown;
  throughAds?: unknown;
}

function parseIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function isFutureTimestamp(isoTimestamp: string): boolean {
  const timestamp = Date.parse(isoTimestamp);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

export function parseSessionCreatePayload(input: unknown): {
  data: SessionCreatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Session payload is invalid." };
  }

  const candidate = input as SessionCreatePayloadCandidate;
  const createNewClient = candidate.createNewClient;
  if (typeof createNewClient !== "boolean") {
    return { data: null, error: "Create client selection is invalid." };
  }

  const selectedClientId =
    typeof candidate.selectedClientId === "string" && candidate.selectedClientId.trim().length > 0
      ? candidate.selectedClientId.trim()
      : null;
  const clientName = typeof candidate.clientName === "string" ? candidate.clientName.trim() : "";
  const clientContact =
    typeof candidate.clientContact === "string" ? candidate.clientContact.trim() : "";

  if (!selectedClientId && !createNewClient) {
    return {
      data: null,
      error: "Select an existing client or create a new one before saving.",
    };
  }

  if (createNewClient && clientName.length < 1) {
    return {
      data: null,
      error: "Client name is required for a new client.",
    };
  }

  const priceMinor = candidate.priceMinor;
  if (typeof priceMinor !== "number" || !Number.isInteger(priceMinor) || priceMinor < 0) {
    return { data: null, error: "Price is invalid." };
  }

  const sessionDurationMinutes = candidate.sessionDurationMinutes;
  if (
    typeof sessionDurationMinutes !== "number" ||
    !Number.isInteger(sessionDurationMinutes) ||
    sessionDurationMinutes <= 0
  ) {
    return { data: null, error: "Session duration is invalid." };
  }

  const sessionAtIso = parseIsoTimestamp(candidate.sessionAtIso);
  if (!sessionAtIso) {
    return { data: null, error: "Session date and time is invalid." };
  }
  if (isFutureTimestamp(sessionAtIso)) {
    return { data: null, error: "Session date and time cannot be in the future." };
  }
  const throughAds = candidate.throughAds;
  if (throughAds !== null && throughAds !== undefined && typeof throughAds !== "boolean") {
    return { data: null, error: "Advertising selection is invalid." };
  }

  return {
    data: {
      selectedClientId,
      createNewClient,
      clientName,
      clientContact,
      priceMinor,
      sessionDurationMinutes,
      sessionAtIso,
      throughAds: throughAds ?? null,
    },
    error: null,
  };
}
