import {
  EXPENSE_DEFAULT_DATE_RANGE,
  EXPENSE_VALID_DATE_RANGES,
  filterValidExpenseCategories,
  isValidExpenseDateRange,
  parseExpenseDateRange,
} from "./expense-query-params";

describe("expense query param helpers", () => {
  describe("EXPENSE_VALID_DATE_RANGES", () => {
    it("contains the expected presets (no thisMonth — expenses defaults to last90Days)", () => {
      expect([...EXPENSE_VALID_DATE_RANGES].sort()).toEqual(
        ["allTime", "last30Days", "last90Days", "yearToDate"].sort(),
      );
    });
  });

  describe("EXPENSE_DEFAULT_DATE_RANGE", () => {
    it("defaults to last90Days", () => {
      expect(EXPENSE_DEFAULT_DATE_RANGE).toBe("last90Days");
    });
  });

  describe("isValidExpenseDateRange", () => {
    it("accepts known presets", () => {
      expect(isValidExpenseDateRange("last30Days")).toBe(true);
      expect(isValidExpenseDateRange("allTime")).toBe(true);
    });

    it("rejects unknown presets", () => {
      expect(isValidExpenseDateRange("thisMonth")).toBe(false);
      expect(isValidExpenseDateRange(null)).toBe(false);
    });
  });

  describe("parseExpenseDateRange", () => {
    it("returns the value when valid", () => {
      expect(parseExpenseDateRange("yearToDate")).toBe("yearToDate");
    });

    it("falls back to last90Days when invalid or missing", () => {
      expect(parseExpenseDateRange("nope")).toBe("last90Days");
      expect(parseExpenseDateRange(null)).toBe("last90Days");
    });
  });

  describe("filterValidExpenseCategories", () => {
    it("keeps only known category values", () => {
      const result = filterValidExpenseCategories([
        "ink",
        "needles",
        "not_a_category",
        "travel",
      ]);
      expect(result).toEqual(["ink", "needles", "travel"]);
    });

    it("returns an empty array when none are valid", () => {
      expect(filterValidExpenseCategories(["nope", "still_nope"])).toEqual([]);
    });

    it("returns an empty array for empty input", () => {
      expect(filterValidExpenseCategories([])).toEqual([]);
    });
  });
});
