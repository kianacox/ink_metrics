import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "../currency";
import { ensureUserProfile } from "./ensure-user-profile";

interface MockProfilesQuery {
  capturedSelectArgs?: { columns: string; options: unknown };
  capturedSelectFilter?: { column: string; value: unknown };
  capturedUpsert?: { payload: unknown; options: unknown };
  countResult: { count: number | null; error: unknown };
  upsertResult: { error: unknown };
}

function buildMockSupabase(query: MockProfilesQuery) {
  return {
    from(tableName: "profiles") {
      void tableName;
      return {
        select(columns: string, options: unknown) {
          query.capturedSelectArgs = { columns, options };
          const eqChain = {
            eq(column: string, value: unknown) {
              query.capturedSelectFilter = { column, value };
              return Promise.resolve(query.countResult);
            },
          };
          return eqChain;
        },
        upsert(payload: unknown, options: unknown) {
          query.capturedUpsert = { payload, options };
          return Promise.resolve(query.upsertResult);
        },
      };
    },
  };
}

describe("ensureUserProfile", () => {
  it("throws when userId is missing", async () => {
    const mockSupabase = {
      from(tableName: "profiles") {
        void tableName;
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ count: 0, error: null });
              },
            };
          },
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
    const query: MockProfilesQuery = {
      countResult: { count: 0, error: null },
      upsertResult: { error: null },
    };
    const mockSupabase = buildMockSupabase(query);

    const before = new Date();
    const result = await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });
    const after = new Date();

    const upsert = query.capturedUpsert;
    expect(upsert).toBeDefined();

    const payload = upsert!.payload as Record<string, unknown>;
    expect(payload.user_id).toBe("user-123");
    expect(payload.default_currency).toBe(DEFAULT_CURRENCY);
    expect(payload.is_profile_complete).toBe(false);
    expect(typeof payload.trial_started_at).toBe("string");

    const trialDate = new Date(payload.trial_started_at as string);
    expect(trialDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(trialDate.getTime()).toBeLessThanOrEqual(after.getTime());

    expect(upsert!.options).toEqual({
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
    expect(result).toBe(query.upsertResult);
  });

  it("sets is_founding_user to true when fewer than 50 founding profiles exist", async () => {
    const query: MockProfilesQuery = {
      countResult: { count: 49, error: null },
      upsertResult: { error: null },
    };
    const mockSupabase = buildMockSupabase(query);

    await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-49",
    });

    expect(query.capturedSelectArgs).toEqual({
      columns: "*",
      options: { count: "exact", head: true },
    });
    expect(query.capturedSelectFilter).toEqual({
      column: "is_founding_user",
      value: true,
    });

    const payload = query.capturedUpsert!.payload as Record<string, unknown>;
    expect(payload.is_founding_user).toBe(true);
  });

  it("sets is_founding_user to false when 50 founding profiles already exist", async () => {
    const query: MockProfilesQuery = {
      countResult: { count: 50, error: null },
      upsertResult: { error: null },
    };
    const mockSupabase = buildMockSupabase(query);

    await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-50",
    });

    const payload = query.capturedUpsert!.payload as Record<string, unknown>;
    expect(payload.is_founding_user).toBe(false);
  });

  it("sets is_founding_user to false when more than 50 founding profiles already exist", async () => {
    const query: MockProfilesQuery = {
      countResult: { count: 123, error: null },
      upsertResult: { error: null },
    };
    const mockSupabase = buildMockSupabase(query);

    await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-123",
    });

    const payload = query.capturedUpsert!.payload as Record<string, unknown>;
    expect(payload.is_founding_user).toBe(false);
  });

  it("treats a null count as zero and sets is_founding_user to true", async () => {
    const query: MockProfilesQuery = {
      countResult: { count: null, error: null },
      upsertResult: { error: null },
    };
    const mockSupabase = buildMockSupabase(query);

    await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "user-null-count",
    });

    const payload = query.capturedUpsert!.payload as Record<string, unknown>;
    expect(payload.is_founding_user).toBe(true);
  });

  it("preserves ignoreDuplicates so a returning user's is_founding_user is not overwritten", async () => {
    const query: MockProfilesQuery = {
      countResult: { count: 10, error: null },
      upsertResult: { error: null },
    };
    const mockSupabase = buildMockSupabase(query);

    await ensureUserProfile({
      supabase: mockSupabase as unknown as SupabaseClient,
      userId: "returning-user",
    });

    expect(query.capturedUpsert!.options).toEqual({
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
  });
});
