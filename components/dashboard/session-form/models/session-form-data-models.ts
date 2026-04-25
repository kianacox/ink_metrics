export interface SaveSessionParams {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  clientContact: string;
  priceMinor: number;
  sessionDate: string;      // "YYYY-MM-DD"
  throughAds: boolean | null;
  inProgress: boolean;
}

export interface SaveSessionResult {
  success: boolean;
  message?: string;
}

export interface SaveSessionApiResponse {
  error?: string;
  client?: {
    client_id: string;
    name: string;
  } | null;
}
