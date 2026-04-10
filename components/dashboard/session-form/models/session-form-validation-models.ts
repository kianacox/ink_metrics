import type { ClientOption } from "./client-selection-models";

export interface SessionFormValidationInput {
  selectedClientId: string | null;
  createNewClient: boolean;
  clientName: string;
  hours: string;
  minutes: string;
  profit: string;
  sessionAtLocal: string;
  reportingTimezone: string;
  clients: ClientOption[];
}

export interface EditableSessionFieldsInput {
  hours: string;
  minutes: string;
  profit: string;
  sessionAtLocal: string;
  reportingTimezone: string;
}
