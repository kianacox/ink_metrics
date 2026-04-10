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

export interface SessionUpdatePayload {
  priceMinor: number;
  sessionDurationMinutes: number;
  sessionAtIso: string;
}

export interface SessionCreatePayloadCandidate {
  selectedClientId?: unknown;
  createNewClient?: unknown;
  clientName?: unknown;
  clientContact?: unknown;
  priceMinor?: unknown;
  sessionDurationMinutes?: unknown;
  sessionAtIso?: unknown;
  throughAds?: unknown;
}

export interface SessionUpdatePayloadCandidate {
  priceMinor?: unknown;
  sessionDurationMinutes?: unknown;
  sessionAtIso?: unknown;
  [key: string]: unknown;
}
