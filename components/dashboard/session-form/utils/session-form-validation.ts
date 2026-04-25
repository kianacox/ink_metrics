import { toMinorUnits } from "@/lib/currency";
import { isSupportedTimezone } from "@/lib/timezones";
import { DateTime } from "luxon";
import {
  isDuplicateClientName,
  normalizeClientName,
} from "@/components/dashboard/session-form/utils/client-selection";
import type {
  EditableSessionFieldsInput,
  SessionFormValidationInput,
} from "@/components/dashboard/session-form/models";
export type { EditableSessionFieldsInput, SessionFormValidationInput };

type EditableSessionFieldsResult =
  | { valid: true; sessionDate: string; priceMinor: number }
  | { valid: false; errorMessage: string };

type SessionFormValidationResult =
  | { valid: true; normalizedClientName: string; sessionDate: string; priceMinor: number }
  | { valid: false; errorMessage: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSION_BACKDATE_MONTHS = 6;

function isFutureDateInTimezone(dateString: string, reportingTimezone: string): boolean {
  const todayInTz = DateTime.now().setZone(reportingTimezone).startOf("day");
  const sessionDay = DateTime.fromISO(dateString, { zone: reportingTimezone }).startOf("day");
  return sessionDay > todayInTz;
}

function isTooFarInPastInTimezone(dateString: string, reportingTimezone: string): boolean {
  const todayInTz = DateTime.now().setZone(reportingTimezone).startOf("day");
  const limitInTz = todayInTz.minus({ months: MAX_SESSION_BACKDATE_MONTHS });
  const sessionDay = DateTime.fromISO(dateString, { zone: reportingTimezone }).startOf("day");
  return sessionDay < limitInTz;
}

export function validateEditableSessionFields(
  input: EditableSessionFieldsInput,
): EditableSessionFieldsResult {
  const sessionDate = input.sessionDate.trim();

  if (!sessionDate || !DATE_PATTERN.test(sessionDate)) {
    return { valid: false, errorMessage: "Session date is required." };
  }

  if (!isSupportedTimezone(input.reportingTimezone)) {
    return { valid: false, errorMessage: "Reporting timezone is invalid." };
  }

  if (isFutureDateInTimezone(sessionDate, input.reportingTimezone)) {
    return { valid: false, errorMessage: "Session date cannot be in the future." };
  }

  if (isTooFarInPastInTimezone(sessionDate, input.reportingTimezone)) {
    return { valid: false, errorMessage: "Session date cannot be more than 6 months in the past." };
  }

  try {
    const priceMinor = toMinorUnits(input.profit);
    return { valid: true, sessionDate, priceMinor };
  } catch {
    return { valid: false, errorMessage: "Price must be a valid number." };
  }
}

export function validateSessionForm(
  input: SessionFormValidationInput,
): SessionFormValidationResult {
  const normalizedClientName = normalizeClientName(input.clientName);

  if (!input.selectedClientId && !input.createNewClient) {
    return { valid: false, errorMessage: "Select an existing client or create a new one before saving." };
  }
  if (input.createNewClient && !normalizedClientName) {
    return { valid: false, errorMessage: "Client name is required for a new client." };
  }
  if (input.createNewClient && isDuplicateClientName(input.clients, normalizedClientName)) {
    return { valid: false, errorMessage: "A client with this name already exists. Choose it from Existing client." };
  }

  const editableFieldsValidation = validateEditableSessionFields({
    profit: input.profit,
    sessionDate: input.sessionDate,
    reportingTimezone: input.reportingTimezone,
  });

  if (!editableFieldsValidation.valid) return editableFieldsValidation;

  return {
    valid: true,
    normalizedClientName,
    sessionDate: editableFieldsValidation.sessionDate,
    priceMinor: editableFieldsValidation.priceMinor,
  };
}
