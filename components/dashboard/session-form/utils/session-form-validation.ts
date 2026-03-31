import { toMinorUnits } from "@/lib/currency";
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
  clients: ClientOption[];
}

type SessionFormValidationResult =
  | {
      valid: true;
      normalizedClientName: string;
      sessionDurationMinutes: number;
      priceMinor: number;
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

  try {
    const priceMinor = toMinorUnits(input.profit);
    return {
      valid: true,
      normalizedClientName,
      sessionDurationMinutes: durationResult.totalMinutes,
      priceMinor,
    };
  } catch {
    return { valid: false, errorMessage: "Profit must be a valid number." };
  }
}
