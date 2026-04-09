import { toMinorUnits } from "@/lib/currency";
import { convertLocalDateTimeInTimezoneToUtcIso, isSupportedTimezone } from "@/lib/timezones";
import {
  isDuplicateClientName,
  normalizeClientName,
  validateDuration,
  type ClientOption,
} from "@/components/dashboard/session-form/utils/client-selection";

interface SessionFormValidationInput {
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

type SessionFormValidationResult =
  | {
      valid: true;
      normalizedClientName: string;
      sessionDurationMinutes: number;
      priceMinor: number;
      sessionAtIso: string;
    }
  | {
      valid: false;
      errorMessage: string;
    };

export function validateSessionForm(
  input: SessionFormValidationInput,
): SessionFormValidationResult {
  const normalizedClientName = normalizeClientName(input.clientName);
  const durationResult = validateDuration(input.hours, input.minutes);

  if (!durationResult.valid) {
    return { valid: false, errorMessage: durationResult.errorMessage };
  }

  if (!input.selectedClientId && !input.createNewClient) {
    return {
      valid: false,
      errorMessage: "Select an existing client or create a new one before saving.",
    };
  }

  if (input.createNewClient && !normalizedClientName) {
    return {
      valid: false,
      errorMessage: "Client name is required for a new client.",
    };
  }

  if (input.createNewClient && isDuplicateClientName(input.clients, normalizedClientName)) {
    return {
      valid: false,
      errorMessage: "A client with this name already exists. Choose it from Existing client.",
    };
  }

  const normalizedSessionAtLocal = input.sessionAtLocal.trim();
  if (!normalizedSessionAtLocal) {
    return {
      valid: false,
      errorMessage: "Session date and time are required.",
    };
  }

  if (!isSupportedTimezone(input.reportingTimezone)) {
    return {
      valid: false,
      errorMessage: "Reporting timezone is invalid.",
    };
  }

  const sessionAtIso = convertLocalDateTimeInTimezoneToUtcIso(
    normalizedSessionAtLocal,
    input.reportingTimezone,
  );
  if (!sessionAtIso) {
    return {
      valid: false,
      errorMessage: "Session date and time is invalid.",
    };
  }

  const sessionTimestamp = Date.parse(sessionAtIso);
  if (Number.isFinite(sessionTimestamp) && sessionTimestamp > Date.now()) {
    return {
      valid: false,
      errorMessage: "Session date and time cannot be in the future.",
    };
  }

  try {
    const priceMinor = toMinorUnits(input.profit);
    return {
      valid: true,
      normalizedClientName,
      sessionDurationMinutes: durationResult.totalMinutes,
      priceMinor,
      sessionAtIso,
    };
  } catch {
    return { valid: false, errorMessage: "Price must be a valid number." };
  }
}
