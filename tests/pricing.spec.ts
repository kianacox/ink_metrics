import { test, expect, request as playwrightRequest } from "@playwright/test";
import { FOUNDING_MEMBER_LIMIT } from "@/lib/marketing/get-founding-count";
import {
  cleanupFoundingFixtureProfiles,
  isFoundingSeedError,
  seedFoundingProfiles,
} from "./founding-helpers";

/**
 * Module-level accumulator for created user_ids. We assign during `beforeAll`
 * before awaiting the seed call so a partial failure inside
 * `seedFoundingProfiles` still leaves the already-created user_ids reachable
 * to `afterAll` for cleanup.
 */
let createdFoundingUserIds: string[] = [];

test.describe("Pricing page — founding tier", () => {
  test("renders the founding £9.99 card with embedded counter when spots are available", async ({
    page,
  }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", { name: /Simple pricing/i }),
    ).toBeVisible();

    // Headline founding price
    await expect(page.getByText("£9.99")).toBeVisible();
    await expect(page.getByText("£14.99")).toHaveCount(0);

    // 60-day trial copy
    await expect(page.getByText(/60 days free/i).first()).toBeVisible();
    await expect(
      page.getByText(/after your 60-day free trial/i),
    ).toBeVisible();

    // Founding-price-for-life note
    await expect(page.getByText(/locked.*for life/i)).toBeVisible();

    // Embedded founding counter
    await expect(
      page.getByText(
        new RegExp(`of ${FOUNDING_MEMBER_LIMIT} founding spots taken`, "i"),
      ),
    ).toBeVisible();
  });
});

test.describe.serial("Pricing page — founding spots full", () => {
  test.beforeAll(async () => {
    try {
      createdFoundingUserIds = await seedFoundingProfiles(
        FOUNDING_MEMBER_LIMIT,
      );
    } catch (error) {
      if (isFoundingSeedError(error)) {
        createdFoundingUserIds = error.partialUserIds;
      }
      throw error;
    }

    // The pricing page wraps `getFoundingCount` in `unstable_cache`. Hit the
    // test-only revalidate endpoint so the next request reads fresh data
    // from the database instead of an earlier (not-full) cached response.
    const baseURL =
      process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
    const apiContext = await playwrightRequest.newContext({ baseURL });
    try {
      const response = await apiContext.post(
        "/api/__test__/revalidate-founding-count",
      );
      expect(response.ok()).toBeTruthy();
    } finally {
      await apiContext.dispose();
    }
  });

  test.afterAll(async () => {
    await cleanupFoundingFixtureProfiles(createdFoundingUserIds);
    createdFoundingUserIds = [];
  });

  test("renders the standard £14.99 card with full-state counter when founding spots are full", async ({
    page,
  }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", { name: /Simple pricing/i }),
    ).toBeVisible();

    // Headline standard price
    await expect(page.getByText("£14.99")).toBeVisible();
    await expect(page.getByText("£9.99")).toHaveCount(0);

    // 60-day trial copy still present
    await expect(page.getByText(/60 days free/i).first()).toBeVisible();
    await expect(
      page.getByText(/after your 60-day free trial/i),
    ).toBeVisible();

    // Full-state founding counter
    await expect(
      page.getByText(
        `Founding spots full — ${FOUNDING_MEMBER_LIMIT} founding members joined`,
      ),
    ).toBeVisible();

    // The founding-price-for-life note must NOT appear when full
    await expect(page.getByText(/locked.*for life/i)).toHaveCount(0);
  });
});
