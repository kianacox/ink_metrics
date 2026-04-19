export interface SessionCreatePayload {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDurationMinutes: number;
  sessionAtIso: string;
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface SessionUpdatePayload {
  priceMinor: number;
  sessionDurationMinutes: number;
  sessionAtIso: string;
  inProgress: boolean;
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
  inProgress?: unknown;
}

export interface SessionUpdatePayloadCandidate {
  priceMinor?: unknown;
  sessionDurationMinutes?: unknown;
  sessionAtIso?: unknown;
  inProgress?: unknown;
  [key: string]: unknown;
}
