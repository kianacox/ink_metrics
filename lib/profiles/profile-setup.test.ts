import {
  parseProfileSetupPayload,
  toBps,
  toMinorAmount,
} from "./profile-setup";

describe("profile setup helpers", () => {
  describe("toMinorAmount", () => {
    it("converts decimal amount to minor units", () => {
      expect(toMinorAmount("123.45")).toBe(12345);
    });

    it("returns null for invalid values", () => {
      expect(toMinorAmount("")).toBeNull();
      expect(toMinorAmount("-5")).toBeNull();
      expect(toMinorAmount("abc")).toBeNull();
    });
  });

  describe("toBps", () => {
    it("converts percent to bps", () => {
      expect(toBps("70")).toBe(7000);
      expect(toBps("12.5")).toBe(1250);
    });

    it("returns null for out-of-range values", () => {
      expect(toBps("0")).toBeNull();
      expect(toBps("101")).toBeNull();
    });
  });

  describe("parseProfileSetupPayload", () => {
    it("accepts valid fixed-rent payload", () => {
      const result = parseProfileSetupPayload({
        displayName: "Jane",
        defaultCurrency: "GBP",
        reportingTimezone: "Europe/London",
        payChairRent: true,
        rentType: "fixed",
        fixedFrequency: "weekly",
        fixedAmountMinor: 25000,
        commissionRateBps: null,
        commissionCapped: null,
        commissionCapFrequency: null,
        commissionCapAmountMinor: null,
      });

      expect(result.error).toBeNull();
      expect(result.data?.rentType).toBe("fixed");
    });

    it("accepts valid commission-capped payload", () => {
      const result = parseProfileSetupPayload({
        displayName: "Jane",
        defaultCurrency: "USD",
        reportingTimezone: "Europe/London",
        payChairRent: true,
        rentType: "commission",
        fixedFrequency: null,
        fixedAmountMinor: null,
        commissionRateBps: 3000,
        commissionCapped: true,
        commissionCapFrequency: "monthly",
        commissionCapAmountMinor: 400000,
      });

      expect(result.error).toBeNull();
      expect(result.data?.commissionCapped).toBe(true);
    });

    it("rejects invalid mixed payload", () => {
      const result = parseProfileSetupPayload({
        displayName: "Jane",
        defaultCurrency: "EUR",
        reportingTimezone: "Europe/London",
        payChairRent: true,
        rentType: "fixed",
        fixedFrequency: "monthly",
        fixedAmountMinor: 200000,
        commissionRateBps: 5000,
        commissionCapped: false,
        commissionCapFrequency: null,
        commissionCapAmountMinor: null,
      });

      expect(result.error).toMatch(/Commission fields must be empty/);
      expect(result.data).toBeNull();
    });

    it("rejects fixed rent when amount is missing", () => {
      const result = parseProfileSetupPayload({
        displayName: "Jane",
        defaultCurrency: "GBP",
        reportingTimezone: "Europe/London",
        payChairRent: true,
        rentType: "fixed",
        fixedFrequency: "weekly",
        fixedAmountMinor: null,
        commissionRateBps: null,
        commissionCapped: null,
        commissionCapFrequency: null,
        commissionCapAmountMinor: null,
      });

      expect(result.error).toBe("Fixed rent frequency and amount are required.");
      expect(result.data).toBeNull();
    });

    it("rejects commission rent when cap decision is missing", () => {
      const result = parseProfileSetupPayload({
        displayName: "Jane",
        defaultCurrency: "USD",
        reportingTimezone: "Europe/London",
        payChairRent: true,
        rentType: "commission",
        fixedFrequency: null,
        fixedAmountMinor: null,
        commissionRateBps: 2500,
        commissionCapped: null,
        commissionCapFrequency: null,
        commissionCapAmountMinor: null,
      });

      expect(result.error).toBe("Commission cap selection is required.");
      expect(result.data).toBeNull();
    });

    it("rejects no-rent payload that still includes rent details", () => {
      const result = parseProfileSetupPayload({
        displayName: "Jane",
        defaultCurrency: "EUR",
        reportingTimezone: "Europe/London",
        payChairRent: false,
        rentType: "fixed",
        fixedFrequency: "monthly",
        fixedAmountMinor: 40000,
        commissionRateBps: null,
        commissionCapped: null,
        commissionCapFrequency: null,
        commissionCapAmountMinor: null,
      });

      expect(result.error).toBe("Rent details must be empty when rent is not paid.");
      expect(result.data).toBeNull();
    });
  });

  it("rejects payload with invalid reporting timezone", () => {
    const result = parseProfileSetupPayload({
      displayName: "Jane",
      defaultCurrency: "GBP",
      reportingTimezone: "Mars/Phobos",
      payChairRent: false,
      rentType: null,
      fixedFrequency: null,
      fixedAmountMinor: null,
      commissionRateBps: null,
      commissionCapped: null,
      commissionCapFrequency: null,
      commissionCapAmountMinor: null,
    });

    expect(result.error).toBe("Reporting timezone is invalid.");
    expect(result.data).toBeNull();
  });
});
