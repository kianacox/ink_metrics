import { expect, test } from "@playwright/test";
import { loginAsUser } from "./auth-helpers";

const DEMO_USER_EMAIL = "test@test.com";
const DEMO_USER_PASSWORD = "Password123";
const EXPECTED_TAKE_HOME_MINOR = {
  grossMinor: 196000,
  paidToStudioMinor: 47000,
  totalExpensesMinor: 6200,
  netMinor: 142800,
} as const;

test.beforeEach(async ({ page }) => {
  await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("renders take-home summary values and comparative bars for seeded data", async ({ page }) => {
  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();
  expect(analyticsPayload.takeHome).toEqual(EXPECTED_TAKE_HOME_MINOR);
  expect(
    analyticsPayload.takeHome.grossMinor
      - analyticsPayload.takeHome.paidToStudioMinor
      - analyticsPayload.takeHome.totalExpensesMinor,
  ).toBe(analyticsPayload.takeHome.netMinor);

  const monthLabel = new Date().toLocaleString("en-GB", { month: "long" });

  await expect(page.getByRole("heading", { name: `${monthLabel} stats` })).toBeVisible();
  const takeHomeTitle = page.getByText("Take-home summary", { exact: true });
  await expect(takeHomeTitle).toBeVisible();
  const takeHomeCard = takeHomeTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();

  await expect(takeHomeCard.getByText("Gross", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Paid to studio", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Expenses", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Net", { exact: true })).toBeVisible();

  await expect(takeHomeCard.getByText("£1,960.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£470.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£62.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£1,428.00")).toBeVisible();

  await expect(takeHomeCard.getByLabel("Gross comparison bar")).toBeVisible();
  await expect(takeHomeCard.getByLabel("Paid to studio comparison bar")).toBeVisible();
  await expect(takeHomeCard.getByLabel("Expenses comparison bar")).toBeVisible();
  await expect(takeHomeCard.getByLabel("Net comparison bar")).toBeVisible();
});
