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

  it("upserts profile with default GBP currency and duplicate-safe options", async () => {
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

    const result = await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });

    expect(capturedTableName).toBe("profiles");
    expect(capturedPayload).toEqual({
      user_id: "user-123",
      default_currency: DEFAULT_CURRENCY,
      is_profile_complete: false,
    });
    expect(capturedOptions).toEqual({
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
    expect(result).toBe(mockResult);
  });
});
