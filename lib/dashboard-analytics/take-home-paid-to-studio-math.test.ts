import { DateTime } from "luxon";

type RentType = "commission" | "fixed" | null;
type Frequency = "weekly" | "monthly" | null;

interface CompensationSettings {
  payChairRent: boolean;
  rentType: RentType;
  fixedFrequency: Frequency;
  fixedAmountMinor: number | null;
  commissionRateBps: number | null;
  commissionCapped: boolean | null;
  commissionCapFrequency: Frequency;
  commissionCapAmountMinor: number | null;
}

interface SessionForMath {
  compensationVersionId: string;
  priceMinor: number;
  sessionAtIso: string;
  compensation: CompensationSettings;
}

function bucketStartIso({
  sessionAtIso,
  timezone,
  frequency,
}: {
  sessionAtIso: string;
  timezone: string;
  frequency: "weekly" | "monthly";
}): string {
  const local = DateTime.fromISO(sessionAtIso, { zone: "utc" }).setZone(timezone);
  const start = frequency === "weekly" ? local.startOf("week") : local.startOf("month");
  return start.toISODate() ?? "invalid";
}

function computePaidToStudioMinor({
  sessions,
  timezone,
}: {
  sessions: SessionForMath[];
  timezone: string;
}): number {
  const commissionGrossByBucket = new Map<string, {
    grossMinor: number;
    commissionRateBps: number;
    commissionCapped: boolean;
    commissionCapAmountMinor: number | null;
  }>();
  const fixedAppliedBuckets = new Set<string>();
  let fixedTotalMinor = 0;

  for (const session of sessions) {
    const { compensation } = session;
    if (!compensation.payChairRent || !compensation.rentType) {
      continue;
    }

    if (compensation.rentType === "commission" && compensation.commissionRateBps) {
      const capped = compensation.commissionCapped === true;
      const frequency = capped && compensation.commissionCapFrequency === "weekly"
        ? "weekly"
        : "monthly";
      const bucketStart = bucketStartIso({
        sessionAtIso: session.sessionAtIso,
        timezone,
        frequency,
      });
      const bucketKey = `${session.compensationVersionId}:${frequency}:${bucketStart}`;
      const existing = commissionGrossByBucket.get(bucketKey);
      if (existing) {
        existing.grossMinor += session.priceMinor;
      } else {
        commissionGrossByBucket.set(bucketKey, {
          grossMinor: session.priceMinor,
          commissionRateBps: compensation.commissionRateBps,
          commissionCapped: capped,
          commissionCapAmountMinor: compensation.commissionCapAmountMinor,
        });
      }
      continue;
    }

    if (
      compensation.rentType === "fixed" &&
      compensation.fixedAmountMinor !== null &&
      compensation.fixedFrequency
    ) {
      const bucketStart = bucketStartIso({
        sessionAtIso: session.sessionAtIso,
        timezone,
        frequency: compensation.fixedFrequency,
      });
      const bucketKey = `${session.compensationVersionId}:${compensation.fixedFrequency}:${bucketStart}`;
      if (!fixedAppliedBuckets.has(bucketKey)) {
        fixedAppliedBuckets.add(bucketKey);
        fixedTotalMinor += compensation.fixedAmountMinor;
      }
    }
  }

  let commissionTotalMinor = 0;
  for (const bucket of commissionGrossByBucket.values()) {
    const rawMinor = Math.floor((bucket.grossMinor * bucket.commissionRateBps) / 10000);
    if (bucket.commissionCapped) {
      commissionTotalMinor += Math.min(rawMinor, bucket.commissionCapAmountMinor ?? 0);
    } else {
      commissionTotalMinor += rawMinor;
    }
  }

  return commissionTotalMinor + fixedTotalMinor;
}

describe("take-home paid-to-studio math matrix", () => {
  const tz = "Europe/London";

  it("returns 0 when chair rent is disabled", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 50000,
          sessionAtIso: "2026-04-08T10:00:00.000Z",
          compensation: {
            payChairRent: false,
            rentType: null,
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
      ],
    });

    expect(paid).toBe(0);
  });

  it("computes uncapped commission monthly and ignores stale cap fields", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 90000,
          sessionAtIso: "2026-04-01T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: false,
            commissionCapFrequency: "weekly",
            commissionCapAmountMinor: 1000,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 10000,
          sessionAtIso: "2026-04-18T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: false,
            commissionCapFrequency: "weekly",
            commissionCapAmountMinor: 1000,
          },
        },
      ],
    });

    expect(paid).toBe(25000);
  });

  it("applies capped commission per local week bucket", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 80000,
          sessionAtIso: "2026-04-08T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: true,
            commissionCapFrequency: "weekly",
            commissionCapAmountMinor: 15000,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 60000,
          sessionAtIso: "2026-04-09T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: true,
            commissionCapFrequency: "weekly",
            commissionCapAmountMinor: 15000,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 20000,
          sessionAtIso: "2026-04-15T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: true,
            commissionCapFrequency: "weekly",
            commissionCapAmountMinor: 15000,
          },
        },
      ],
    });

    expect(paid).toBe(20000);
  });

  it("applies capped commission once per local month bucket", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 200000,
          sessionAtIso: "2026-04-05T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: true,
            commissionCapFrequency: "monthly",
            commissionCapAmountMinor: 30000,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 100000,
          sessionAtIso: "2026-04-20T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "commission",
            fixedFrequency: null,
            fixedAmountMinor: null,
            commissionRateBps: 2500,
            commissionCapped: true,
            commissionCapFrequency: "monthly",
            commissionCapAmountMinor: 30000,
          },
        },
      ],
    });

    expect(paid).toBe(30000);
  });

  it("applies fixed weekly once per version per week bucket", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 12000,
          sessionAtIso: "2026-04-08T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "weekly",
            fixedAmountMinor: 15000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 32000,
          sessionAtIso: "2026-04-09T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "weekly",
            fixedAmountMinor: 15000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 18000,
          sessionAtIso: "2026-04-15T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "weekly",
            fixedAmountMinor: 15000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
      ],
    });

    expect(paid).toBe(30000);
  });

  it("applies fixed monthly once per version per month bucket", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 20000,
          sessionAtIso: "2026-04-02T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "monthly",
            fixedAmountMinor: 50000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
        {
          compensationVersionId: "v1",
          priceMinor: 40000,
          sessionAtIso: "2026-04-29T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "monthly",
            fixedAmountMinor: 50000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
      ],
    });

    expect(paid).toBe(50000);
  });

  it("handles compensation version boundary crossing within the same week", () => {
    const paid = computePaidToStudioMinor({
      timezone: tz,
      sessions: [
        {
          compensationVersionId: "v1",
          priceMinor: 12000,
          sessionAtIso: "2026-04-08T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "weekly",
            fixedAmountMinor: 10000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
        {
          compensationVersionId: "v2",
          priceMinor: 22000,
          sessionAtIso: "2026-04-09T10:00:00.000Z",
          compensation: {
            payChairRent: true,
            rentType: "fixed",
            fixedFrequency: "weekly",
            fixedAmountMinor: 15000,
            commissionRateBps: null,
            commissionCapped: null,
            commissionCapFrequency: null,
            commissionCapAmountMinor: null,
          },
        },
      ],
    });

    expect(paid).toBe(25000);
  });
});
