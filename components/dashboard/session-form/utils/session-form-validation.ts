import { toMinorUnits } from "@/lib/currency";
import { convertLocalDateTimeInTimezoneToUtcIso, isSupportedTimezone } from "@/lib/timezones";
import {
  isDuplicateClientName,
  normalizeClientName,
  validateDuration,
} from "@/components/dashboard/session-form/utils/client-selection";
import type {
  EditableSessionFieldsInput,
  SessionFormValidationInput,
} from "@/components/dashboard/session-form/models";
export type { EditableSessionFieldsInput, SessionFormValidationInput };

type EditableSessionFieldsResult =
  | {
      valid: true;
      sessionDurationMinutes: number;
      priceMinor: number;
      sessionAtIso: string;
    }
  | {
      valid: false;
      errorMessage: string;
    };

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

const MAX_SESSION_BACKDATE_MONTHS = 6;
const BACKDATE_LIMIT_ERROR_MESSAGE =
  "Session date and time cannot be more than 6 months in the past.";

function getBackdateLimitTimestamp(nowTimestamp: number): number {
  const backdateLimit = new Date(nowTimestamp);
  backdateLimit.setUTCMonth(backdateLimit.getUTCMonth() - MAX_SESSION_BACKDATE_MONTHS);
  return backdateLimit.getTime();
}

export function validateEditableSessionFields(
  input: EditableSessionFieldsInput,
): EditableSessionFieldsResult {
  const durationResult = validateDuration(input.hours, input.minutes);

  if (!durationResult.valid) {
    return { valid: false, errorMessage: durationResult.errorMessage };
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
  if (
    Number.isFinite(sessionTimestamp) &&
    sessionTimestamp < getBackdateLimitTimestamp(Date.now())
  ) {
    return {
      valid: false,
      errorMessage: BACKDATE_LIMIT_ERROR_MESSAGE,
    };
  }

  try {
    const priceMinor = toMinorUnits(input.profit);
    return {
      valid: true,
      sessionDurationMinutes: durationResult.totalMinutes,
      priceMinor,
      sessionAtIso,
    };
  } catch {
    return { valid: false, errorMessage: "Price must be a valid number." };
  }
}

export function validateSessionForm(
  input: SessionFormValidationInput,
): SessionFormValidationResult {
  const normalizedClientName = normalizeClientName(input.clientName);

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

  const editableFieldsValidation = validateEditableSessionFields({
    hours: input.hours,
    minutes: input.minutes,
    profit: input.profit,
    sessionAtLocal: input.sessionAtLocal,
    reportingTimezone: input.reportingTimezone,
  });

  if (!editableFieldsValidation.valid) {
    return editableFieldsValidation;
  }

  return {
    valid: true,
    normalizedClientName,
    sessionDurationMinutes: editableFieldsValidation.sessionDurationMinutes,
    priceMinor: editableFieldsValidation.priceMinor,
    sessionAtIso: editableFieldsValidation.sessionAtIso,
  };
}
