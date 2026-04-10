import type {
  ClientOption,
  DurationValidationResult,
} from "@/components/dashboard/session-form/models";
export type { ClientOption, DurationValidationResult };

const MINUTES_PER_HOUR = 60;

export function normalizeClientName(value: string): string {
  return value.trim();
}

export function getFilteredClients(
  clients: ClientOption[],
  query: string,
): ClientOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 1) {
    return [];
  }

  return clients.filter((client) =>
    client.name.toLowerCase().includes(normalizedQuery),
  );
}

export function isDuplicateClientName(
  clients: ClientOption[],
  name: string,
): boolean {
  const normalizedName = normalizeClientName(name).toLowerCase();
  if (!normalizedName) {
    return false;
  }

  return clients.some(
    (client) => normalizeClientName(client.name).toLowerCase() === normalizedName,
  );
}

export function validateDuration(
  hoursValue: string,
  minutesValue: string,
): DurationValidationResult {
  const parsedHours = Number.parseInt(hoursValue, 10);
  const parsedMinutes = Number.parseInt(minutesValue, 10);

  if (
    !Number.isFinite(parsedHours) ||
    !Number.isInteger(parsedHours) ||
    parsedHours < 0
  ) {
    return {
      valid: false,
      totalMinutes: 0,
      errorMessage: "Hours must be a whole number of zero or greater.",
    };
  }

  if (
    !Number.isFinite(parsedMinutes) ||
    !Number.isInteger(parsedMinutes) ||
    parsedMinutes < 0 ||
    parsedMinutes >= MINUTES_PER_HOUR
  ) {
    return {
      valid: false,
      totalMinutes: 0,
      errorMessage: "Minutes must be a whole number between 0 and 59.",
    };
  }

  const totalMinutes = parsedHours * MINUTES_PER_HOUR + parsedMinutes;
  if (totalMinutes <= 0) {
    return {
      valid: false,
      totalMinutes: 0,
      errorMessage: "Session length must be greater than zero minutes.",
    };
  }

  return {
    valid: true,
    totalMinutes,
    errorMessage: "",
  };
}
