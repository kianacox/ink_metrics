import type { RentFrequency, RentType } from "@/lib/profiles/profile-setup";

/**
 * Snapshot of the values currently persisted for the user across `profiles`
 * and the active `artist_compensation_versions` row. Used to decide whether a
 * profile edit is a display-name-only update (immediate path) or a
 * compensation change (deferred rollover path).
 */
export interface ActiveProfileSnapshot {
  displayName: string;
  reportingTimezone: string;
  payChairRent: boolean;
  rentType: RentType | null;
  fixedFrequency: RentFrequency | null;
  fixedAmountMinor: number | null;
  commissionRateBps: number | null;
  commissionCapped: boolean | null;
  commissionCapFrequency: RentFrequency | null;
  commissionCapAmountMinor: number | null;
}

export type ProfileUpdateCandidate = ActiveProfileSnapshot;

/**
 * The set of fields that, when changed, must trigger a compensation version
 * rollover. `reportingTimezone` is included because it affects the local-date
 * boundaries used in financial computation.
 */
const COMPENSATION_FIELDS = [
  "reportingTimezone",
  "payChairRent",
  "rentType",
  "fixedFrequency",
  "fixedAmountMinor",
  "commissionRateBps",
  "commissionCapped",
  "commissionCapFrequency",
  "commissionCapAmountMinor",
] as const satisfies ReadonlyArray<keyof ActiveProfileSnapshot>;

/**
 * Returns true when the candidate update changes only the display name and
 * leaves every compensation-relevant field equal to the snapshot. Returns
 * false otherwise — including when nothing differs at all (no-op save).
 */
export function isDisplayNameOnlyChange(
  snapshot: ActiveProfileSnapshot,
  candidate: ProfileUpdateCandidate,
): boolean {
  if (snapshot.displayName === candidate.displayName) {
    return false;
  }

  for (const field of COMPENSATION_FIELDS) {
    if (snapshot[field] !== candidate[field]) {
      return false;
    }
  }

  return true;
}
