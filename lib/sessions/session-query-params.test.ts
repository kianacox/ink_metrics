import {
  SESSION_VALID_DATE_RANGES,
  SESSION_VALID_SORT_FIELDS,
  isValidSessionDateRange,
  isValidSessionSortField,
  parseSessionDateRange,
  parseSessionSortField,
} from "./session-query-params";

describe("session query param helpers", () => {
  describe("SESSION_VALID_SORT_FIELDS", () => {
    it("contains the expected sort fields", () => {
      expect([...SESSION_VALID_SORT_FIELDS].sort()).toEqual(["date", "profit"].sort());
    });
  });

  describe("SESSION_VALID_DATE_RANGES", () => {
    it("contains the expected presets (no thisMonth — sessions defaults to last30Days)", () => {
      expect([...SESSION_VALID_DATE_RANGES].sort()).toEqual(
        ["allTime", "last30Days", "last90Days", "yearToDate"].sort(),
      );
    });
  });

  describe("isValidSessionSortField", () => {
    it("accepts known sort fields", () => {
      expect(isValidSessionSortField("date")).toBe(true);
      expect(isValidSessionSortField("profit")).toBe(true);
    });

    it("rejects unknown values", () => {
      expect(isValidSessionSortField("session_count")).toBe(false);
      expect(isValidSessionSortField(null)).toBe(false);
    });
  });

  describe("parseSessionSortField", () => {
    it("returns the value when valid", () => {
      expect(parseSessionSortField("profit")).toBe("profit");
    });

    it("falls back to date when invalid", () => {
      expect(parseSessionSortField("nope")).toBe("date");
      expect(parseSessionSortField(null)).toBe("date");
    });
  });

  describe("isValidSessionDateRange", () => {
    it("accepts known presets", () => {
      expect(isValidSessionDateRange("last30Days")).toBe(true);
      expect(isValidSessionDateRange("yearToDate")).toBe(true);
      expect(isValidSessionDateRange("allTime")).toBe(true);
    });

    it("rejects unknown presets", () => {
      expect(isValidSessionDateRange("thisMonth")).toBe(false);
      expect(isValidSessionDateRange(null)).toBe(false);
    });
  });

  describe("parseSessionDateRange", () => {
    it("returns the value when valid", () => {
      expect(parseSessionDateRange("yearToDate")).toBe("yearToDate");
    });

    it("falls back to last30Days when invalid", () => {
      expect(parseSessionDateRange("nope")).toBe("last30Days");
      expect(parseSessionDateRange(null)).toBe("last30Days");
    });
  });
});
