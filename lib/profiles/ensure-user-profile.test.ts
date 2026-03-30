import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CURRENCY } from "../currency";
import { ensureUserProfile } from "./ensure-user-profile";

test("throws when userId is missing", async () => {
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

  await assert.rejects(
    () =>
      ensureUserProfile({
        supabase: mockSupabase as unknown as SupabaseClient,
        userId: "",
      }),
    /Cannot create a profile without a user id\./,
  );
});

test("upserts profile with default GBP currency and duplicate-safe options", async () => {
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

  assert.equal(capturedTableName, "profiles");
  assert.deepEqual(capturedPayload, {
    user_id: "user-123",
    default_currency: DEFAULT_CURRENCY,
  });
  assert.deepEqual(capturedOptions, {
    onConflict: "user_id",
    ignoreDuplicates: true,
  });
  assert.equal(result, mockResult);
});
