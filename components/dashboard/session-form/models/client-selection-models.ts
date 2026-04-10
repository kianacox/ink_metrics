export interface ClientOption {
  client_id: string;
  name: string;
}

export interface DurationValidationResult {
  valid: boolean;
  totalMinutes: number;
  errorMessage: string;
}
