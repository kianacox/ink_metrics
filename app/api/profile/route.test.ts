/**
 * @jest-environment node
 */
import { NextResponse } from "next/server";
import { PUT } from "./route";
import { requireAuthenticatedApiUser } from "@/lib/supabase/require-authenticated-api-user";
import { fetchProfileSettings } from "@/lib/profiles/fetch-profile-settings";

jest.mock("@/lib/supabase/require-authenticated-api-user", () => ({
  requireAuthenticatedApiUser: jest.fn(),
}));

jest.mock("@/lib/profiles/fetch-profile-settings", () => ({
  fetchProfileSettings: jest.fn(),
}));

const mockedAuth = jest.mocked(requireAuthenticatedApiUser);
const mockedFetchSettings = jest.mocked(fetchProfileSettings);

interface SettingsArgs {
  displayName?: string;
  reportingTimezone?: string;
  defaultCurrency?: string;
  payChairRent?: boolean;
  rentType?: string | null;
  fixedFrequency?: string | null;
  fixedAmountMinor?: number | null;
  commissionRateBps?: number | null;
  commissionCapped?: boolean | null;
  commissionCapFrequency?: string | null;
  commissionCapAmountMinor?: number | null;
  marketingConsent?: boolean;
}

function mockSettings(overrides: SettingsArgs = {}) {
  const merged = {
    displayName: "Old Name",
    reportingTimezone: "Europe/London",
    defaultCurrency: "GBP",
    payChairRent: true,
    rentType: "fixed",
    fixedFrequency: "monthly",
    fixedAmountMinor: 60000,
    commissionRateBps: null,
    commissionCapped: null,
    commissionCapFrequency: null,
    commissionCapAmountMinor: null,
    marketingConsent: false,
    ...overrides,
  };

  mockedFetchSettings.mockResolvedValue({
    profile: {
      display_name: merged.displayName,
      default_currency: merged.defaultCurrency,
      reporting_timezone: merged.reportingTimezone,
      marketing_consent: merged.marketingConsent,
    },
    compensation: {
      pay_chair_rent: merged.payChairRent,
      rent_type: merged.rentType,
      fixed_frequency: merged.fixedFrequency,
      fixed_amount_minor: merged.fixedAmountMinor,
      commission_rate_bps: merged.commissionRateBps,
      commission_capped: merged.commissionCapped,
      commission_cap_frequency: merged.commissionCapFrequency,
      commission_cap_amount_minor: merged.commissionCapAmountMinor,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthenticated(rpc: jest.Mock) {
  mockedAuth.mockResolvedValue({
    supabase: { rpc } as never,
    user: { id: "user-1" } as never,
    errorResponse: null,
  });
}

const SHARED_BODY_BASE = {
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

describe("PUT /api/profile — display name vs rollover routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns auth error when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({
      supabase: {} as never,
      user: null,
      errorResponse: NextResponse.json(
        { error: "You must be signed in to edit your profile." },
        { status: 401 },
      ),
    });

    const response = await PUT(
      makeRequest({ ...SHARED_BODY_BASE, displayName: "Anything" }),
    );

    expect(response.status).toBe(401);
  });

  it("calls update_profile_display_name when only display name changed", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    mockAuthenticated(rpc);
    mockSettings({ displayName: "Old Name" });

    const response = await PUT(
      makeRequest({ ...SHARED_BODY_BASE, displayName: "Brand New Name" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("update_profile_display_name", {
      p_display_name: "Brand New Name",
    });
    expect(body).toEqual({ success: true });
    expect(body.effectiveFrom).toBeUndefined();
  });

  it("calls rollover_profile_compensation_version when chair rent amount changed", async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: "2026-05-01", error: null });
    mockAuthenticated(rpc);
    mockSettings({
      displayName: "Old Name",
      fixedAmountMinor: 60000,
    });

    const response = await PUT(
      makeRequest({
        ...SHARED_BODY_BASE,
        displayName: "Old Name",
        fixedAmountMinor: 75000,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "rollover_profile_compensation_version",
      expect.objectContaining({
        p_display_name: "Old Name",
        p_fixed_amount_minor: 75000,
      }),
    );
    expect(body).toEqual({ success: true, effectiveFrom: "2026-05-01" });
  });

  it("calls rollover when reportingTimezone changes (timezone is chair-rent-adjacent)", async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: "2026-05-01", error: null });
    mockAuthenticated(rpc);
    mockSettings({ displayName: "Old Name", reportingTimezone: "Europe/London" });

    const response = await PUT(
      makeRequest({
        ...SHARED_BODY_BASE,
        displayName: "Old Name",
        reportingTimezone: "America/New_York",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "rollover_profile_compensation_version",
      expect.objectContaining({
        p_reporting_timezone: "America/New_York",
      }),
    );
    expect(body.effectiveFrom).toBe("2026-05-01");
  });

  it("calls rollover when display name AND chair rent both change, passing new display name", async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: "2026-05-01", error: null });
    mockAuthenticated(rpc);
    mockSettings({
      displayName: "Old Name",
      fixedAmountMinor: 60000,
    });

    await PUT(
      makeRequest({
        ...SHARED_BODY_BASE,
        displayName: "Brand New Name",
        fixedAmountMinor: 80000,
      }),
    );

    expect(rpc).toHaveBeenCalledWith(
      "rollover_profile_compensation_version",
      expect.objectContaining({
        p_display_name: "Brand New Name",
        p_fixed_amount_minor: 80000,
      }),
    );
  });

  it("returns 400 when display-name update RPC fails", async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    mockAuthenticated(rpc);
    mockSettings({ displayName: "Old Name" });

    const response = await PUT(
      makeRequest({ ...SHARED_BODY_BASE, displayName: "New Name" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 409 when profile setup is incomplete (no settings)", async () => {
    mockAuthenticated(jest.fn());
    mockedFetchSettings.mockResolvedValue(null);

    const response = await PUT(
      makeRequest({ ...SHARED_BODY_BASE, displayName: "New Name" }),
    );

    expect(response.status).toBe(409);
  });
});
