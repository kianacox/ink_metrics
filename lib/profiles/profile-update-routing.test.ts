import {
  isDisplayNameOnlyChange,
  type ActiveProfileSnapshot,
  type ProfileUpdateCandidate,
} from "@/lib/profiles/profile-update-routing";

const BASE_SNAPSHOT: ActiveProfileSnapshot = {
  displayName: "Old Name",
  reportingTimezone: "Europe/London",
  payChairRent: true,
  rentType: "fixed",
  fixedFrequency: "monthly",
  fixedAmountMinor: 60000,
  commissionRateBps: null,
  commissionCapped: null,
  commissionCapFrequency: null,
  commissionCapAmountMinor: null,
};

function candidateMatching(
  snapshot: ActiveProfileSnapshot,
  overrides: Partial<ProfileUpdateCandidate> = {},
): ProfileUpdateCandidate {
  return { ...snapshot, ...overrides };
}

describe("isDisplayNameOnlyChange", () => {
  it("returns true when only displayName differs", () => {
    const candidate = candidateMatching(BASE_SNAPSHOT, {
      displayName: "New Name",
    });

    expect(isDisplayNameOnlyChange(BASE_SNAPSHOT, candidate)).toBe(true);
  });

  it("returns false when reportingTimezone differs (timezone is chair-rent-adjacent)", () => {
    const candidate = candidateMatching(BASE_SNAPSHOT, {
      displayName: "New Name",
      reportingTimezone: "America/New_York",
    });

    expect(isDisplayNameOnlyChange(BASE_SNAPSHOT, candidate)).toBe(false);
  });

  it("returns false when payChairRent differs", () => {
    const candidate = candidateMatching(BASE_SNAPSHOT, {
      payChairRent: false,
      rentType: null,
      fixedFrequency: null,
      fixedAmountMinor: null,
    });

    expect(isDisplayNameOnlyChange(BASE_SNAPSHOT, candidate)).toBe(false);
  });

  it("returns false when rentType differs", () => {
    const candidate = candidateMatching(BASE_SNAPSHOT, {
      rentType: "commission",
      fixedFrequency: null,
      fixedAmountMinor: null,
      commissionRateBps: 3000,
      commissionCapped: false,
    });

    expect(isDisplayNameOnlyChange(BASE_SNAPSHOT, candidate)).toBe(false);
  });

  it("returns false when fixedAmountMinor differs", () => {
    const candidate = candidateMatching(BASE_SNAPSHOT, {
      fixedAmountMinor: 70000,
    });

    expect(isDisplayNameOnlyChange(BASE_SNAPSHOT, candidate)).toBe(false);
  });

  it("returns false when commissionRateBps differs", () => {
    const snapshot: ActiveProfileSnapshot = {
      ...BASE_SNAPSHOT,
      rentType: "commission",
      fixedFrequency: null,
      fixedAmountMinor: null,
      commissionRateBps: 3000,
      commissionCapped: false,
    };
    const candidate = candidateMatching(snapshot, {
      commissionRateBps: 4000,
    });

    expect(isDisplayNameOnlyChange(snapshot, candidate)).toBe(false);
  });

  it("returns false when nothing differs (no-op save)", () => {
    const candidate = candidateMatching(BASE_SNAPSHOT, {});

    expect(isDisplayNameOnlyChange(BASE_SNAPSHOT, candidate)).toBe(false);
  });

  it("treats null and null as equal", () => {
    const snapshot: ActiveProfileSnapshot = {
      ...BASE_SNAPSHOT,
      payChairRent: false,
      rentType: null,
      fixedFrequency: null,
      fixedAmountMinor: null,
    };
    const candidate = candidateMatching(snapshot, {
      displayName: "Different Name",
    });

    expect(isDisplayNameOnlyChange(snapshot, candidate)).toBe(true);
  });
});
