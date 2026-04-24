export interface SessionCreatePayload {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDate: string;
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface SessionUpdatePayload {
  priceMinor: number;
  sessionDate: string;
  inProgress: boolean;
}

export interface SessionCreatePayloadCandidate {
  selectedClientId?: unknown;
  createNewClient?: unknown;
  clientName?: unknown;
  clientContact?: unknown;
  priceMinor?: unknown;
  sessionDate?: unknown;
  throughAds?: unknown;
  inProgress?: unknown;
}

export interface SessionUpdatePayloadCandidate {
  priceMinor?: unknown;
  sessionDate?: unknown;
  inProgress?: unknown;
  [key: string]: unknown;
}
