import {
  prevMonth,
  nextMonth,
  currentYYYYMM,
  formatMonthLabel,
} from "./month-arithmetic";

describe("month-arithmetic helpers", () => {
  describe("prevMonth", () => {
    it("returns the prior month within the same year", () => {
      expect(prevMonth("2026-04")).toBe("2026-03");
    });

    it("rolls over to December of the previous year when given January", () => {
      expect(prevMonth("2026-01")).toBe("2025-12");
    });

    it("zero-pads single-digit months", () => {
      expect(prevMonth("2026-10")).toBe("2026-09");
    });
  });

  describe("nextMonth", () => {
    it("returns the next month within the same year", () => {
      expect(nextMonth("2026-04")).toBe("2026-05");
    });

    it("rolls over to January of the next year when given December", () => {
      expect(nextMonth("2025-12")).toBe("2026-01");
    });

    it("zero-pads single-digit months", () => {
      expect(nextMonth("2026-08")).toBe("2026-09");
    });
  });

  describe("currentYYYYMM", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns a YYYY-MM string for the current month", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 3, 30).getTime()); // April 30 2026 local
      expect(currentYYYYMM()).toBe("2026-04");
    });

    it("zero-pads single-digit months", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 0, 5).getTime()); // January 5 2026 local
      expect(currentYYYYMM()).toBe("2026-01");
    });
  });

  describe("formatMonthLabel", () => {
    it("returns the month name and year for a YYYY-MM string", () => {
      expect(formatMonthLabel("2026-04")).toEqual({
        monthLabel: "April",
        year: 2026,
      });
    });

    it("returns January for 01", () => {
      expect(formatMonthLabel("2026-01")).toEqual({
        monthLabel: "January",
        year: 2026,
      });
    });

    it("returns December for 12", () => {
      expect(formatMonthLabel("2025-12")).toEqual({
        monthLabel: "December",
        year: 2025,
      });
    });
  });
});
