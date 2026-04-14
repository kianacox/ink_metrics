import { bootstrapUserProfile } from "./bootstrap-user-profile";
import { ensureUserProfile } from "./ensure-user-profile";

jest.mock("./ensure-user-profile", () => ({
  ensureUserProfile: jest.fn(),
}));

const mockedEnsureUserProfile = jest.mocked(ensureUserProfile);

describe("bootstrapUserProfile", () => {
  const mockSupabase = {} as Parameters<typeof bootstrapUserProfile>[0]["supabase"];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns early when userId is missing", async () => {
    await bootstrapUserProfile({
      supabase: mockSupabase,
      userId: null,
      source: "unit_test",
    });

    expect(mockedEnsureUserProfile).not.toHaveBeenCalled();
  });

  it("delegates to ensureUserProfile when userId is present", async () => {
    mockedEnsureUserProfile.mockResolvedValueOnce({ error: null } as never);

    await bootstrapUserProfile({
      supabase: mockSupabase,
      userId: "user-123",
      source: "unit_test",
    });

    expect(mockedEnsureUserProfile).toHaveBeenCalledWith({
      supabase: mockSupabase,
      userId: "user-123",
    });
  });

  it("logs when ensureUserProfile returns an error and does not throw", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedEnsureUserProfile.mockResolvedValueOnce({
      error: { message: "boom" },
    } as never);

    await expect(
      bootstrapUserProfile({
        supabase: mockSupabase,
        userId: "user-123",
        source: "unit_test",
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith("profile_bootstrap_failed", {
      source: "unit_test",
      userRef: "***",
      errorCode: "UNKNOWN",
      message: "boom",
    });

    consoleErrorSpy.mockRestore();
  });
});
