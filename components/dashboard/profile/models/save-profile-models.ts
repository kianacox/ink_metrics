export interface SaveProfilePayload {
  displayName: string;
  reportingTimezone: string;
  payChairRent: boolean;
  rentType: "fixed" | "commission" | null;
  fixedFrequency: "weekly" | "monthly" | null;
  fixedAmountMinor: number | null;
  commissionRateBps: number | null;
  commissionCapped: boolean | null;
  commissionCapFrequency: "weekly" | "monthly" | null;
  commissionCapAmountMinor: number | null;
}

export interface SaveProfileResult {
  success: boolean;
  error?: string;
  effectiveFrom?: string;  // "YYYY-MM-DD" — when compensation changes take effect
}

export interface SaveProfileApiResponse {
  error?: string;
  effectiveFrom?: string;  // "YYYY-MM-DD"
}
