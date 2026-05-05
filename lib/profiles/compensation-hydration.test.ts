import { hydrateMissingCompensationVersions } from "./compensation-hydration";
import type { SessionRow } from "@/lib/sessions/models";

interface MockVersionQuery {
  eq: jest.Mock;
  lte: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
}

function createVersionQuery(
  row: {
    compensation_version_id: string;
    pay_chair_rent: boolean;
    rent_type: string | null;
    fixed_frequency: string | null;
    fixed_amount_minor: number | null;
    commission_rate_bps: number | null;
    commission_capped: boolean | null;
    commission_cap_frequency: string | null;
    commission_cap_amount_minor: number | null;
  } | null,
): MockVersionQuery {
  const query: Partial<MockVersionQuery> = {};
  query.eq = jest.fn(() => query);
  query.lte = jest.fn(() => query);
  query.or = jest.fn(() => query);
  query.order = jest.fn(() => query);
  query.limit = jest.fn().mockResolvedValue({ data: row ? [row] : [], error: null });
  return query as MockVersionQuery;
}

describe("hydrateMissingCompensationVersions", () => {
  it("returns rows unchanged when none are missing compensation data", async () => {
    const rows: SessionRow[] = [
      {
        session_id: "s-1",
        price: 5000,
        session_at: "2026-03-12",
        compensation_version_id: "cv-existing",
        artist_compensation_versions: { compensation_version_id: "cv-existing" },
      },
    ];

    const from = jest.fn();
    const supabase = { from } as never;

    const result = await hydrateMissingCompensationVersions({
      supabase,
      userId: "user-1",
      rows,
    });

    expect(from).not.toHaveBeenCalled();
    expect(result).toEqual(rows);
  });

  it("hydrates rows missing compensation data via lookup by session_at", async () => {
    const rows: SessionRow[] = [
      {
        session_id: "s-1",
        price: 5000,
        session_at: "2026-03-12",
        compensation_version_id: null,
        artist_compensation_versions: null,
      },
    ];

    const versionQuery = createVersionQuery({
      compensation_version_id: "cv-1",
      pay_chair_rent: true,
      rent_type: "fixed",
      fixed_frequency: "weekly",
      fixed_amount_minor: 15000,
      commission_rate_bps: null,
      commission_capped: null,
      commission_cap_frequency: null,
      commission_cap_amount_minor: null,
    });

    const from = jest.fn().mockReturnValue({ select: jest.fn(() => versionQuery) });
    const supabase = { from } as never;

    const result = await hydrateMissingCompensationVersions({
      supabase,
      userId: "user-1",
      rows,
    });

    expect(from).toHaveBeenCalledWith("artist_compensation_versions");
    expect(versionQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(versionQuery.lte).toHaveBeenCalledWith("effective_from", "2026-03-12");
    expect(versionQuery.or).toHaveBeenCalledWith(
      "effective_to.is.null,effective_to.gt.2026-03-12",
    );
    expect(result[0]?.compensation_version_id).toBe("cv-1");
    expect(result[0]?.artist_compensation_versions).toEqual(
      expect.objectContaining({ compensation_version_id: "cv-1" }),
    );
  });

  it("skips rows with null session_at", async () => {
    const rows: SessionRow[] = [
      {
        session_id: "s-1",
        price: 5000,
        session_at: null,
        compensation_version_id: null,
        artist_compensation_versions: null,
      },
    ];

    const from = jest.fn();
    const supabase = { from } as never;

    const result = await hydrateMissingCompensationVersions({
      supabase,
      userId: "user-1",
      rows,
    });

    expect(from).not.toHaveBeenCalled();
    expect(result).toEqual(rows);
  });

  it("leaves rows untouched when lookup returns no matching version", async () => {
    const rows: SessionRow[] = [
      {
        session_id: "s-1",
        price: 5000,
        session_at: "2026-03-12",
        compensation_version_id: null,
        artist_compensation_versions: null,
      },
    ];

    const versionQuery = createVersionQuery(null);
    const from = jest.fn().mockReturnValue({ select: jest.fn(() => versionQuery) });
    const supabase = { from } as never;

    const result = await hydrateMissingCompensationVersions({
      supabase,
      userId: "user-1",
      rows,
    });

    expect(result[0]?.compensation_version_id).toBeNull();
    expect(result[0]?.artist_compensation_versions).toBeNull();
  });

  it("ignores lookup errors and keeps the row unchanged", async () => {
    const rows: SessionRow[] = [
      {
        session_id: "s-1",
        price: 5000,
        session_at: "2026-03-12",
        compensation_version_id: null,
        artist_compensation_versions: null,
      },
    ];

    const versionQuery: MockVersionQuery = {
      eq: jest.fn(() => versionQuery),
      lte: jest.fn(() => versionQuery),
      or: jest.fn(() => versionQuery),
      order: jest.fn(() => versionQuery),
      limit: jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    };
    const from = jest.fn().mockReturnValue({ select: jest.fn(() => versionQuery) });
    const supabase = { from } as never;

    const result = await hydrateMissingCompensationVersions({
      supabase,
      userId: "user-1",
      rows,
    });

    expect(result[0]?.compensation_version_id).toBeNull();
  });

  it("only hydrates rows that are missing compensation, leaving others untouched", async () => {
    const rows: SessionRow[] = [
      {
        session_id: "s-existing",
        price: 5000,
        session_at: "2026-03-12",
        compensation_version_id: "cv-existing",
        artist_compensation_versions: { compensation_version_id: "cv-existing" },
      },
      {
        session_id: "s-missing",
        price: 4500,
        session_at: "2026-03-11",
        compensation_version_id: null,
        artist_compensation_versions: null,
      },
    ];

    const versionQuery = createVersionQuery({
      compensation_version_id: "cv-resolved",
      pay_chair_rent: true,
      rent_type: "fixed",
      fixed_frequency: "weekly",
      fixed_amount_minor: 10000,
      commission_rate_bps: null,
      commission_capped: null,
      commission_cap_frequency: null,
      commission_cap_amount_minor: null,
    });

    const from = jest.fn().mockReturnValue({ select: jest.fn(() => versionQuery) });
    const supabase = { from } as never;

    const result = await hydrateMissingCompensationVersions({
      supabase,
      userId: "user-1",
      rows,
    });

    expect(from).toHaveBeenCalledTimes(1);
    expect(result[0]?.compensation_version_id).toBe("cv-existing");
    expect(result[1]?.compensation_version_id).toBe("cv-resolved");
  });
});
