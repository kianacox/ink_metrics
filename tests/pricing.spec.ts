import { test, expect } from "@playwright/test";
import {
  cleanupFoundingFixtureProfiles,
  seedFoundingProfilesUpTo,
} from "./founding-helpers";

const FOUNDING_LIMIT = 50;
const CACHE_REVALIDATE_SECONDS = 60;

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
      page.getByText(/of 50 founding spots taken/i),
    ).toBeVisible();
  });
});

test.describe.serial("Pricing page — founding spots full", () => {
  let createdUserIds: string[] = [];

  test.beforeAll(async () => {
    createdUserIds = await seedFoundingProfilesUpTo(FOUNDING_LIMIT);

    // The pricing page wraps `getFoundingCount` in `unstable_cache` with a
    // 60-second revalidation. If a previous test in the run already cached
    // the not-full count, we must wait out the revalidation window before
    // hitting the page to see the full state.
    await new Promise((resolve) =>
      setTimeout(resolve, (CACHE_REVALIDATE_SECONDS + 5) * 1000),
    );
  });

  test.afterAll(async () => {
    await cleanupFoundingFixtureProfiles(createdUserIds);
    createdUserIds = [];
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
      page.getByText("Founding spots full — 50 founding members joined"),
    ).toBeVisible();

    // The founding-price-for-life note must NOT appear when full
    await expect(page.getByText(/locked.*for life/i)).toHaveCount(0);
  });
});
