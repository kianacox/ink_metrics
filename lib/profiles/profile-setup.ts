import { isSupportedTimezone } from "@/lib/timezones";

export const PROFILE_CURRENCIES = ["GBP", "USD", "EUR"] as const;
export type ProfileCurrency = (typeof PROFILE_CURRENCIES)[number];

export const RENT_TYPES = ["fixed", "commission"] as const;
export type RentType = (typeof RENT_TYPES)[number];

export const RENT_FREQUENCIES = ["weekly", "monthly"] as const;
export type RentFrequency = (typeof RENT_FREQUENCIES)[number];

export interface ProfileSetupPayload {
  displayName: string;
  defaultCurrency: ProfileCurrency;
  reportingTimezone: string;
  payChairRent: boolean;
  rentType: RentType | null;
  fixedFrequency: RentFrequency | null;
  fixedAmountMinor: number | null;
  commissionRateBps: number | null;
  commissionCapped: boolean | null;
  commissionCapFrequency: RentFrequency | null;
  commissionCapAmountMinor: number | null;
  marketingConsent: boolean;
}

interface ProfileSetupCandidate {
  displayName: string;
  defaultCurrency: unknown;
  reportingTimezone: unknown;
  payChairRent: unknown;
  rentType: unknown;
  fixedFrequency: unknown;
  fixedAmountMinor: unknown;
  commissionRateBps: unknown;
  commissionCapped: unknown;
  commissionCapFrequency: unknown;
  commissionCapAmountMinor: unknown;
  marketingConsent: unknown;
}

function isFrequency(value: unknown): value is RentFrequency {
  return typeof value === "string" && RENT_FREQUENCIES.includes(value as RentFrequency);
}

function isRentType(value: unknown): value is RentType {
  return typeof value === "string" && RENT_TYPES.includes(value as RentType);
}

function isCurrency(value: unknown): value is ProfileCurrency {
  return typeof value === "string" && PROFILE_CURRENCIES.includes(value as ProfileCurrency);
}

function isOptionalNonNegativeInteger(value: unknown): value is number | null {
  if (value === null) {
    return true;
  }

  return Number.isInteger(value) && Number(value) >= 0;
}

function isOptionalBoolean(value: unknown): value is boolean | null {
  return value === null || typeof value === "boolean";
}

function hasAnyFixedFields(candidate: ProfileSetupCandidate): boolean {
  return candidate.fixedFrequency !== null || candidate.fixedAmountMinor !== null;
}

function hasAnyCommissionFields(candidate: ProfileSetupCandidate): boolean {
  return (
    candidate.commissionRateBps !== null ||
    candidate.commissionCapped !== null ||
    candidate.commissionCapFrequency !== null ||
    candidate.commissionCapAmountMinor !== null
  );
}

function hasAnyRentDetails(candidate: ProfileSetupCandidate): boolean {
  return (
    candidate.rentType !== null ||
    hasAnyFixedFields(candidate) ||
    hasAnyCommissionFields(candidate)
  );
}

function validateSharedFields(candidate: ProfileSetupCandidate): string | null {
  if (!isCurrency(candidate.defaultCurrency)) {
    return "Default currency is invalid.";
  }

  if (typeof candidate.payChairRent !== "boolean") {
    return "Chair rent selection is required.";
  }

  if (!isSupportedTimezone(candidate.reportingTimezone)) {
    return "Reporting timezone is invalid.";
  }

  if (!isOptionalNonNegativeInteger(candidate.fixedAmountMinor)) {
    return "Fixed amount is invalid.";
  }

  if (!isOptionalNonNegativeInteger(candidate.commissionCapAmountMinor)) {
    return "Commission cap amount is invalid.";
  }

  if (
    candidate.commissionRateBps !== null &&
    (!Number.isInteger(candidate.commissionRateBps) ||
      Number(candidate.commissionRateBps) < 1 ||
      Number(candidate.commissionRateBps) > 10000)
  ) {
    return "Commission rate must be between 0.01% and 100%.";
  }

  if (!isOptionalBoolean(candidate.commissionCapped)) {
    return "Commission cap selection is invalid.";
  }

  return null;
}

function validateNoChairRent(candidate: ProfileSetupCandidate): string | null {
  if (hasAnyRentDetails(candidate)) {
    return "Rent details must be empty when rent is not paid.";
  }

  return null;
}

function validateFixedRent(candidate: ProfileSetupCandidate): string | null {
  if (!isFrequency(candidate.fixedFrequency) || candidate.fixedAmountMinor === null) {
    return "Fixed rent frequency and amount are required.";
  }

  if (hasAnyCommissionFields(candidate)) {
    return "Commission fields must be empty for fixed rent.";
  }

  return null;
}

function validateCommissionRent(candidate: ProfileSetupCandidate): string | null {
  if (candidate.commissionRateBps === null) {
    return "Commission rate is required.";
  }

  if (hasAnyFixedFields(candidate)) {
    return "Fixed rent fields must be empty for commission.";
  }

  if (candidate.commissionCapped === null) {
    return "Commission cap selection is required.";
  }

  if (candidate.commissionCapped) {
    if (
      !isFrequency(candidate.commissionCapFrequency) ||
      candidate.commissionCapAmountMinor === null
    ) {
      return "Commission cap frequency and amount are required when capped.";
    }

    return null;
  }

  if (candidate.commissionCapFrequency !== null || candidate.commissionCapAmountMinor !== null) {
    return "Commission cap fields must be empty when uncapped.";
  }

  return null;
}

function validateRentStructure(candidate: ProfileSetupCandidate): string | null {
  if (candidate.payChairRent === false) {
    return validateNoChairRent(candidate);
  }

  if (!isRentType(candidate.rentType)) {
    return "Rent type is required.";
  }

  if (candidate.rentType === "fixed") {
    return validateFixedRent(candidate);
  }

  return validateCommissionRent(candidate);
}

export function parseProfileSetupPayload(input: unknown): {
  data: ProfileSetupPayload | null;
  error: string | null;
} {
  if (!input || typeof input !== "object") {
    return { data: null, error: "Profile payload is invalid." };
  }

  const payload = input as Record<string, unknown>;
  const displayNameRaw = payload.displayName;
  const displayName =
    typeof displayNameRaw === "string" ? displayNameRaw.trim() : "";
  const candidate: ProfileSetupCandidate = {
    displayName,
    defaultCurrency: payload.defaultCurrency,
    reportingTimezone: payload.reportingTimezone,
    payChairRent: payload.payChairRent,
    rentType: payload.rentType,
    fixedFrequency: payload.fixedFrequency,
    fixedAmountMinor: payload.fixedAmountMinor,
    commissionRateBps: payload.commissionRateBps,
    commissionCapped: payload.commissionCapped,
    commissionCapFrequency: payload.commissionCapFrequency,
    commissionCapAmountMinor: payload.commissionCapAmountMinor,
    marketingConsent: payload.marketingConsent,
  };

  if (candidate.displayName.length < 2) {
    return { data: null, error: "Name must be at least 2 characters." };
  }

  const sharedValidationError = validateSharedFields(candidate);
  if (sharedValidationError) {
    return { data: null, error: sharedValidationError };
  }

  const rentValidationError = validateRentStructure(candidate);
  if (rentValidationError) {
    return { data: null, error: rentValidationError };
  }

  if (typeof candidate.marketingConsent !== "boolean") {
    return { data: null, error: "Marketing consent must be a boolean." };
  }

  return {
    data: {
      displayName: candidate.displayName,
      defaultCurrency: candidate.defaultCurrency as ProfileCurrency,
      reportingTimezone: candidate.reportingTimezone as string,
      payChairRent: candidate.payChairRent as boolean,
      rentType: isRentType(candidate.rentType) ? candidate.rentType : null,
      fixedFrequency: isFrequency(candidate.fixedFrequency) ? candidate.fixedFrequency : null,
      fixedAmountMinor: candidate.fixedAmountMinor as number | null,
      commissionRateBps: candidate.commissionRateBps as number | null,
      commissionCapped: candidate.commissionCapped as boolean | null,
      commissionCapFrequency: isFrequency(candidate.commissionCapFrequency)
        ? candidate.commissionCapFrequency
        : null,
      commissionCapAmountMinor: candidate.commissionCapAmountMinor as number | null,
      marketingConsent: candidate.marketingConsent as boolean,
    },
    error: null,
  };
}

export function toMinorAmount(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.round(parsedValue * 100);
}

export function toBps(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0 || parsedValue > 100) {
    return null;
  }

  return Math.round(parsedValue * 100);
}
