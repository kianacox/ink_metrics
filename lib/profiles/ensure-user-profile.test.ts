import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "../currency";
import { ensureUserProfile } from "./ensure-user-profile";

describe("ensureUserProfile", () => {
  it("throws when userId is missing", async () => {
    const mockSupabase = {
      from(tableName: "profiles") {
        void tableName;
        return {
          upsert() {
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    await expect(
      ensureUserProfile({
        supabase: mockSupabase as unknown as SupabaseClient,
        userId: "",
      }),
    ).rejects.toThrow("Cannot create a profile without a user id.");
  });

  it("upserts profile with default GBP currency, incomplete flag, trial date, and duplicate-safe options", async () => {
    let capturedTableName = "";
    let capturedPayload: unknown;
    let capturedOptions: unknown;

    const mockResult = { error: null };
    const mockSupabase = {
      from(tableName: "profiles") {
        capturedTableName = tableName;
        return {
          upsert(payload: unknown, options: unknown) {
            capturedPayload = payload;
            capturedOptions = options;
            return Promise.resolve(mockResult);
          },
        };
      },
    };

    const before = new Date();
    const result = await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });
    const after = new Date();

    expect(capturedTableName).toBe("profiles");

    const payload = capturedPayload as Record<string, unknown>;
    expect(payload.user_id).toBe("user-123");
    expect(payload.default_currency).toBe(DEFAULT_CURRENCY);
    expect(payload.is_profile_complete).toBe(false);
    expect(typeof payload.trial_started_at).toBe("string");

    const trialDate = new Date(payload.trial_started_at as string);
    expect(trialDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(trialDate.getTime()).toBeLessThanOrEqual(after.getTime());

    expect(capturedOptions).toEqual({
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
    expect(result).toBe(mockResult);
  });
});
