import { act, renderHook } from "@testing-library/react";
import { useSessionPreferences } from "./use-session-preferences";

describe("useSessionPreferences", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("loads preferences once and reuses cached values on subsequent calls", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          defaultCurrency: "USD",
          reportingTimezone: "America/New_York",
        }),
    }) as jest.Mock;

    const { result } = renderHook(() => useSessionPreferences());

    await act(async () => {
      await result.current.ensureLoaded();
      await result.current.ensureLoaded();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/preferences");
    expect(result.current.defaultCurrency).toBe("USD");
    expect(result.current.reportingTimezone).toBe("America/New_York");
  });
});
