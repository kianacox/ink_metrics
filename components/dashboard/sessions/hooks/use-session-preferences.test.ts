import { act, renderHook } from "@testing-library/react";
import { useSessionPreferences } from "./use-session-preferences";
import { createClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = jest.mocked(createClient);

describe("useSessionPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads preferences once and reuses cached auth/profile values", async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const profileLimit = jest.fn().mockResolvedValue({
      data: [{ default_currency: "USD", reporting_timezone: "America/New_York" }],
      error: null,
    });
    const profileEq = jest.fn().mockReturnValue({ limit: profileLimit });
    const profileSelect = jest.fn().mockReturnValue({ eq: profileEq });
    const from = jest.fn().mockImplementation((tableName: string) => {
      if (tableName !== "profiles") {
        throw new Error(`Unexpected table: ${tableName}`);
      }

      return { select: profileSelect };
    });

    mockedCreateClient.mockReturnValue({
      auth: { getUser },
      from,
    } as never);

    const { result } = renderHook(() => useSessionPreferences());

    await act(async () => {
      await result.current.ensureLoaded();
      await result.current.ensureLoaded();
    });

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(profileSelect).toHaveBeenCalledTimes(1);
    expect(result.current.defaultCurrency).toBe("USD");
    expect(result.current.reportingTimezone).toBe("America/New_York");
  });
});
