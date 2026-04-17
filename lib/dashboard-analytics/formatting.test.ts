import {
  formatHours,
  formatMinorAsCurrency,
  formatPercentage,
  sanitizeFiniteNumber,
} from "@/lib/dashboard-analytics/formatting";

describe("dashboard analytics formatting", () => {
  it("formats minor units as currency", () => {
    const expected = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(123.45);

    expect(formatMinorAsCurrency(12345, "GBP")).toBe(expected);
  });

  it("guards against NaN, Infinity, and negative zero", () => {
    expect(sanitizeFiniteNumber(Number.NaN)).toBe(0);
    expect(sanitizeFiniteNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeFiniteNumber(-0)).toBe(0);
  });

  it("clamps percentages to safe display bounds", () => {
    expect(formatPercentage(0.345)).toBe(
      new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 }).format(
        0.345,
      ),
    );
    expect(formatPercentage(-1)).toBe("0%");
    expect(formatPercentage(3)).toBe("100%");
  });

  it("formats rounded hour values", () => {
    expect(formatHours(0)).toBe("0h");
    expect(formatHours(12.34)).toBe("12.3h");
    expect(formatHours(Number.NaN)).toBe("0h");
  });

  it.todo("adds API route integration assertions for analytics response formatting");
});
