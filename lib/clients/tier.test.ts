import { getClientTier } from "./tier";

describe("getClientTier", () => {
  it.each([
    [0, "one-timer"],
    [1, "one-timer"],
    [2, "regular"],
    [4, "regular"],
    [5, "vip"],
    [10, "vip"],
  ] as const)("returns %s for %i sessions", (count, expected) => {
    expect(getClientTier(count)).toBe(expected);
  });
});
