import type {
  SessionCreatePayload,
  SessionCreatePayloadCandidate,
  SessionUpdatePayload,
  SessionUpdatePayloadCandidate,
} from "@/lib/sessions/models";

export type { SessionCreatePayload, SessionUpdatePayload };

const SESSION_UPDATE_ALLOWED_KEYS = new Set(["priceMinor", "sessionDate", "inProgress"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSION_BACKDATE_MONTHS = 6;

function parseSessionDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const timestamp = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(timestamp)) return null;
  return value;
}

function isFutureDate(dateString: string): boolean {
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const sessionTimestamp = Date.parse(dateString + "T00:00:00Z");
  return sessionTimestamp > todayUtc.getTime();
}

function isTooFarInPast(dateString: string): boolean {
  const limit = new Date();
  limit.setUTCHours(0, 0, 0, 0);
  limit.setUTCMonth(limit.getUTCMonth() - MAX_SESSION_BACKDATE_MONTHS);
  return Date.parse(dateString + "T00:00:00Z") < limit.getTime();
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
    return { data: null, error: "Select an existing client or create a new one before saving." };
  }
  if (createNewClient && clientName.length < 1) {
    return { data: null, error: "Client name is required for a new client." };
  }

  const priceMinor = candidate.priceMinor;
  if (typeof priceMinor !== "number" || !Number.isInteger(priceMinor) || priceMinor < 0) {
    return { data: null, error: "Price is invalid." };
  }

  const sessionDate = parseSessionDate(candidate.sessionDate);
  if (!sessionDate) {
    return { data: null, error: "Session date is invalid." };
  }
  if (isFutureDate(sessionDate)) {
    return { data: null, error: "Session date cannot be in the future." };
  }
  if (isTooFarInPast(sessionDate)) {
    return { data: null, error: "Session date cannot be more than 6 months in the past." };
  }

  const throughAds = candidate.throughAds;
  if (throughAds !== null && throughAds !== undefined && typeof throughAds !== "boolean") {
    return { data: null, error: "Advertising selection is invalid." };
  }
  const inProgress = candidate.inProgress;
  if (inProgress !== null && inProgress !== undefined && typeof inProgress !== "boolean") {
    return { data: null, error: "Follow-up status is invalid." };
  }

  return {
    data: {
      selectedClientId,
      createNewClient,
      clientName,
      clientContact,
      priceMinor,
      sessionDate,
      throughAds: throughAds ?? null,
      inProgress: inProgress === true,
    },
    error: null,
  };
}

export function parseSessionUpdatePayload(input: unknown): {
  data: SessionUpdatePayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Session update payload is invalid." };
  }

  const candidate = input as SessionUpdatePayloadCandidate;
  const hasUnexpectedKeys = Object.keys(candidate).some(
    (key) => !SESSION_UPDATE_ALLOWED_KEYS.has(key),
  );
  if (hasUnexpectedKeys) {
    return { data: null, error: "Only price, session date, and follow-up status can be updated." };
  }

  const priceMinor = candidate.priceMinor;
  if (typeof priceMinor !== "number" || !Number.isInteger(priceMinor) || priceMinor < 0) {
    return { data: null, error: "Price is invalid." };
  }

  const sessionDate = parseSessionDate(candidate.sessionDate);
  if (!sessionDate) {
    return { data: null, error: "Session date is invalid." };
  }
  if (isFutureDate(sessionDate)) {
    return { data: null, error: "Session date cannot be in the future." };
  }
  if (isTooFarInPast(sessionDate)) {
    return { data: null, error: "Session date cannot be more than 6 months in the past." };
  }

  const inProgress = candidate.inProgress;
  if (inProgress !== null && inProgress !== undefined && typeof inProgress !== "boolean") {
    return { data: null, error: "Follow-up status is invalid." };
  }

  return {
    data: { priceMinor, sessionDate, inProgress: inProgress === true },
    error: null,
  };
}
