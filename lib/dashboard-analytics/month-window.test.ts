import { computeCurrentMonthWindow } from "@/lib/dashboard-analytics/month-window";

describe("computeCurrentMonthWindow", () => {
  it("builds a UTC half-open month window", () => {
    const result = computeCurrentMonthWindow({
      timezone: "UTC",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(result).toEqual({
      startUtcIso: "2026-04-01T00:00:00.000Z",
      endUtcIso: "2026-05-01T00:00:00.000Z",
      timezone: "UTC",
      monthLabel: "April",
      monthStartLocalDate: "2026-04-01",
      monthEndLocalDate: "2026-05-01",
    });
  });

  it("respects timezone offsets at month boundaries", () => {
    const london = computeCurrentMonthWindow({
      timezone: "Europe/London",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });
    const losAngeles = computeCurrentMonthWindow({
      timezone: "America/Los_Angeles",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });
    const auckland = computeCurrentMonthWindow({
      timezone: "Pacific/Auckland",
      now: new Date("2026-04-10T12:00:00.000Z"),
    });

    expect(london.startUtcIso).toBe("2026-03-31T23:00:00.000Z");
    expect(london.endUtcIso).toBe("2026-04-30T23:00:00.000Z");
    expect(losAngeles.startUtcIso).toBe("2026-04-01T07:00:00.000Z");
    expect(losAngeles.endUtcIso).toBe("2026-05-01T07:00:00.000Z");

    expect(auckland.timezone).toBe("Pacific/Auckland");
    expect(auckland.monthLabel).toBe("April");
    expect(auckland.monthStartLocalDate).toBe("2026-04-01");
    expect(auckland.monthEndLocalDate).toBe("2026-05-01");
  });
});
