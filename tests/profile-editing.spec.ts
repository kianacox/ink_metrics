import { expect, test, type Page } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";
import {
  expectProfileStatus,
  expectProfileSuccess,
  goToProfilePage,
  openProfileTab,
  saveProfileChanges,
  selectCapFrequency,
  selectChairRent,
  selectCommissionCapped,
  selectFixedFrequency,
  selectRentType,
} from "./profile-helpers";

const SEEDED_DISPLAY_NAME = "Seeded Session User";
const SEEDED_CURRENCY = "GBP";
const SEEDED_TIMEZONE = "Europe/London";

function getProfilePanel(page: Page) {
  return page.locator("#tabpanel-profile");
}

// ---------------------------------------------------------------------------
// Access control — no shared beforeEach; these test unauthenticated and
// incomplete-profile states.
// ---------------------------------------------------------------------------
test.describe("profile editing access control", () => {
  test("unauthenticated users are redirected to login from /dashboard/profile", async ({
    browser,
  }) => {
    const isolatedContext = await browser.newContext();
    const isolatedPage = await isolatedContext.newPage();

    await isolatedPage.goto("/dashboard/profile");
    await expect(isolatedPage).toHaveURL(/\/auth\/login/);

    await isolatedContext.close();
  });

  test("incomplete profile is redirected to profile-setup from /dashboard/profile", async ({
    page,
  }) => {
    await loginAsSeededUser(page, "incomplete");
    await expect(page).toHaveURL(/\/dashboard\/profile-setup/);

    await page.goto("/dashboard/profile");
    await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  });
});

// ---------------------------------------------------------------------------
// Profile editing journeys — shared beforeEach logs in as the seeded complete
// user and confirms landing on the dashboard.
// ---------------------------------------------------------------------------
test.describe("profile editing", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // -------------------------------------------------------------------------
  // Page load
  // -------------------------------------------------------------------------
  test("pre-populates display name, locked currency, and timezone on load", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await expect(profilePanel.locator("#profile-display-name")).toHaveValue(
      SEEDED_DISPLAY_NAME,
    );

    // All three currency buttons are disabled (locked after setup)
    await expect(
      profilePanel.getByRole("button", { name: /^GBP$/i }),
    ).toBeDisabled();
    await expect(
      profilePanel.getByRole("button", { name: /^USD$/i }),
    ).toBeDisabled();
    await expect(
      profilePanel.getByRole("button", { name: /^EUR$/i }),
    ).toBeDisabled();

    // Seeded currency is GBP
    expect(SEEDED_CURRENCY).toBe("GBP");

    await expect(profilePanel.locator("#profile-reporting-timezone")).toHaveValue(
      SEEDED_TIMEZONE,
    );
  });

  // -------------------------------------------------------------------------
  // Display name
  // -------------------------------------------------------------------------
  test("updates display name and shows success message", async ({ page }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await profilePanel.locator("#profile-display-name").fill("Updated Artist Name");
    await saveProfileChanges(page);

    await expectProfileSuccess(page);
  });

  test("shows error when display name is less than 2 characters", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await profilePanel.locator("#profile-display-name").fill("X");
    await saveProfileChanges(page);

    await expectProfileStatus(page, "Name must be at least 2 characters.");
    await expect(page).toHaveURL(/\/dashboard\/profile/);
  });

  // -------------------------------------------------------------------------
  // Compensation — no chair rent
  // -------------------------------------------------------------------------
  test("saves successfully with no chair rent selected", async ({ page }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    // Explicitly select No to be independent of prior test state
    await selectChairRent(page, "no");
    await saveProfileChanges(page);

    await expectProfileSuccess(page);

    // Compensation fields should not be visible
    await expect(profilePanel.locator("#profile-fixed-amount")).not.toBeVisible();
    await expect(
      profilePanel.locator("#profile-commission-rate"),
    ).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Compensation — fixed rate
  // -------------------------------------------------------------------------
  test("saves fixed rate weekly chair rent and shows success", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await selectChairRent(page, "yes");
    await selectRentType(page, "fixed");
    await selectFixedFrequency(page, "weekly");
    await profilePanel.locator("#profile-fixed-amount").fill("150.00");

    await saveProfileChanges(page);
    await expectProfileSuccess(page);
  });

  test("saves fixed rate monthly chair rent and shows success", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await selectChairRent(page, "yes");
    await selectRentType(page, "fixed");
    await selectFixedFrequency(page, "monthly");
    await profilePanel.locator("#profile-fixed-amount").fill("600.00");

    await saveProfileChanges(page);
    await expectProfileSuccess(page);
  });

  // -------------------------------------------------------------------------
  // Compensation — commission
  // -------------------------------------------------------------------------
  test("saves commission uncapped and shows success", async ({ page }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await selectChairRent(page, "yes");
    await selectRentType(page, "commission");
    await profilePanel.locator("#profile-commission-rate").fill("30.00");
    await selectCommissionCapped(page, "no");

    await saveProfileChanges(page);
    await expectProfileSuccess(page);

    await expect(
      profilePanel.locator("#profile-commission-cap-amount"),
    ).not.toBeVisible();
  });

  test("saves commission capped weekly with cap amount and shows success", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await selectChairRent(page, "yes");
    await selectRentType(page, "commission");
    await profilePanel.locator("#profile-commission-rate").fill("25.00");
    await selectCommissionCapped(page, "yes");
    await selectCapFrequency(page, "weekly");
    await profilePanel.locator("#profile-commission-cap-amount").fill("500.00");

    await saveProfileChanges(page);
    await expectProfileSuccess(page);
  });

  // -------------------------------------------------------------------------
  // Compensation type switching
  // -------------------------------------------------------------------------
  test("switching from fixed to commission hides fixed amount field", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await selectChairRent(page, "yes");
    await selectRentType(page, "fixed");

    await expect(profilePanel.locator("#profile-fixed-amount")).toBeVisible();

    await selectRentType(page, "commission");

    await expect(profilePanel.locator("#profile-fixed-amount")).not.toBeVisible();
    await expect(profilePanel.locator("#profile-commission-rate")).toBeVisible();
  });

  test("switching to no chair rent clears all compensation fields", async ({
    page,
  }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    // First build up a fixed rate state
    await selectChairRent(page, "yes");
    await selectRentType(page, "fixed");
    await selectFixedFrequency(page, "weekly");
    await profilePanel.locator("#profile-fixed-amount").fill("100.00");

    // Switch to no chair rent — form calls resetRentDetails(false)
    await selectChairRent(page, "no");

    await expect(profilePanel.locator("#profile-fixed-amount")).not.toBeVisible();
    await expect(
      profilePanel.locator("#profile-commission-rate"),
    ).not.toBeVisible();

    await saveProfileChanges(page);
    await expectProfileSuccess(page);
  });

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------
  test("persisted values are shown after page reload", async ({ page }) => {
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    const newName = `Persisted-${Date.now()}`;
    await profilePanel.locator("#profile-display-name").fill(newName);
    await saveProfileChanges(page);
    await expectProfileSuccess(page);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await openProfileTab(page);
    await expect(profilePanel.locator("#profile-display-name")).toHaveValue(
      newName,
    );
  });

  // -------------------------------------------------------------------------
  // Mobile viewport
  // -------------------------------------------------------------------------
  test("form is visible and submittable at mobile viewport 390x844", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToProfilePage(page);
    const profilePanel = getProfilePanel(page);

    await expect(profilePanel.locator("#profile-display-name")).toBeVisible();
    await expect(profilePanel.locator("#profile-reporting-timezone")).toBeVisible();
    await expect(
      profilePanel.getByRole("button", { name: /^save changes$/i }),
    ).toBeVisible();

    const viewportMetrics = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));

    expect(
      Math.max(viewportMetrics.htmlScrollWidth, viewportMetrics.bodyScrollWidth),
    ).toBeLessThanOrEqual(viewportMetrics.viewportWidth + 1);

    await selectChairRent(page, "no");
    await saveProfileChanges(page);
    await expectProfileSuccess(page);
  });
});
