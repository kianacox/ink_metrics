import type { ClientOption } from "./client-selection-models";

export interface SessionFormValidationInput {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  profit: string;
  sessionDate: string;       // "YYYY-MM-DD"
  reportingTimezone: string;
  clients: ClientOption[];
}

export interface EditableSessionFieldsInput {
  profit: string;
  sessionDate: string;       // "YYYY-MM-DD"
  reportingTimezone: string;
}
