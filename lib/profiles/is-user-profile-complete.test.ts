import type { SupabaseClient } from "@supabase/supabase-js";
import { isUserProfileComplete } from "./is-user-profile-complete";

describe("isUserProfileComplete", () => {
  it("returns false when user id is missing", async () => {
    const result = await isUserProfileComplete({
      supabase: {} as SupabaseClient,
      userId: "",
    });

    expect(result).toBe(false);
  });

  it("returns false when query fails", async () => {
    const mockSupabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  limit() {
                    return Promise.resolve({
                      data: null,
                      error: { message: "query failed" },
                    });
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await isUserProfileComplete({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });

    expect(result).toBe(false);
  });

  it("returns true when profile is complete", async () => {
    const mockSupabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  limit() {
                    return Promise.resolve({
                      data: [{ is_profile_complete: true }],
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await isUserProfileComplete({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });

    expect(result).toBe(true);
  });
});
