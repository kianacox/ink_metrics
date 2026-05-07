/**
 * @jest-environment node
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import { getFoundingCount } from "./get-founding-count";

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

// Pass-through `unstable_cache` so we can directly assert the underlying
// query result without involving the Next.js cache runtime, while still
// being able to inspect the wrapping options.
jest.mock("next/cache", () => ({
  unstable_cache: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

const mockedCreateAdminClient = jest.mocked(createAdminClient);
const mockedUnstableCache = jest.mocked(unstable_cache);

// Snapshot the unstable_cache invocation that happened at module load,
// before tests clear mock state. This proves the wrapping options used
// when `getFoundingCount` was created.
const cacheWrapCalls = [...mockedUnstableCache.mock.calls];

type MockSupabase = {
  from: jest.Mock;
};

function buildSupabaseMock({
  count = 0,
  countError = null,
}: {
  count?: number | null;
  countError?: { message: string } | null;
} = {}): MockSupabase {
  const eqMock = jest.fn().mockResolvedValue({ count, error: countError });
  const selectMock = jest.fn(() => ({ eq: eqMock }));
  const fromMock = jest.fn((table: string) => {
    if (table !== "profiles") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return { select: selectMock };
  });
  return { from: fromMock };
}

describe("getFoundingCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns count and isFull=false when count is below 50", async () => {
    const supabase = buildSupabaseMock({ count: 12 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const result = await getFoundingCount();

    expect(result).toEqual({ count: 12, isFull: false });
    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });

  it("returns isFull=true when count equals exactly 50", async () => {
    const supabase = buildSupabaseMock({ count: 50 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const result = await getFoundingCount();

    expect(result).toEqual({ count: 50, isFull: true });
  });

  it("returns isFull=true when count is greater than 50", async () => {
    const supabase = buildSupabaseMock({ count: 73 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const result = await getFoundingCount();

    expect(result).toEqual({ count: 73, isFull: true });
  });

  it("treats a null count from supabase as 0", async () => {
    const supabase = buildSupabaseMock({ count: null });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    const result = await getFoundingCount();

    expect(result).toEqual({ count: 0, isFull: false });
  });

  it("queries only profiles where is_founding_user is true with a head count", async () => {
    const supabase = buildSupabaseMock({ count: 5 });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    await getFoundingCount();

    const fromResult = supabase.from.mock.results[0]?.value as {
      select: jest.Mock;
    };
    expect(fromResult.select).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
    const selectResult = fromResult.select.mock.results[0]?.value as {
      eq: jest.Mock;
    };
    expect(selectResult.eq).toHaveBeenCalledWith("is_founding_user", true);
  });

  it("throws when the supabase query returns an error", async () => {
    const supabase = buildSupabaseMock({
      count: null,
      countError: { message: "boom" },
    });
    mockedCreateAdminClient.mockReturnValue(supabase as never);

    await expect(getFoundingCount()).rejects.toThrow();
  });

  it("wraps the query in unstable_cache with a 60-second revalidation", () => {
    expect(cacheWrapCalls).toHaveLength(1);
    const [, keyParts, options] = cacheWrapCalls[0]!;
    expect(Array.isArray(keyParts)).toBe(true);
    expect(options).toMatchObject({ revalidate: 60 });
  });
});
