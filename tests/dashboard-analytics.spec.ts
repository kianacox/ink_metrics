import { expect, test } from "@playwright/test";
import { DEFAULT_MAILBOX_DOMAIN, getSignUpPassword } from "./constants";
import { completeProfileSetupMinimal, loginAsUser, signUpAndConfirmUserOnly } from "./auth-helpers";
import { createSessionWithNewClient, createSessionWithExistingClient } from "./session-helpers";

const DEMO_USER_EMAIL = "test@test.com";
const DEMO_USER_PASSWORD = "Password123";
const EXPECTED_TAKE_HOME_MINOR = {
  grossMinor: 196000,
  paidToStudioMinor: 47000,
  totalExpensesMinor: 6200,
  netMinor: 142800,
} as const;
const EXPECTED_RETENTION = {
  numerator: 7,
  denominator: 7,
  rate: 1,
} as const;
const EXPECTED_AVG_PROFIT = {
  sessionCount: 10,
  valueMinor: 14280, // Math.trunc(142800 / 10)
} as const;
const signUpPassword = getSignUpPassword();
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

test("renders take-home summary values and comparative bars for seeded data", async ({ page }) => {
  await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();
  expect(analyticsPayload.takeHome).toEqual(EXPECTED_TAKE_HOME_MINOR);
  expect(analyticsPayload.retention).toEqual(EXPECTED_RETENTION);
  expect(analyticsPayload.averageProfitPerSession).toEqual(EXPECTED_AVG_PROFIT);
  expect(
    analyticsPayload.takeHome.grossMinor
      - analyticsPayload.takeHome.paidToStudioMinor
      - analyticsPayload.takeHome.totalExpensesMinor,
  ).toBe(analyticsPayload.takeHome.netMinor);

  const monthLabel = new Date().toLocaleString("en-GB", { month: "long" });

  await expect(page.getByRole("heading", { name: `${monthLabel} Performance` })).toBeVisible();
  const takeHomeTitle = page.getByText("Take-home summary", { exact: true });
  await expect(takeHomeTitle).toBeVisible();
  const takeHomeCard = takeHomeTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();

  await expect(takeHomeCard.getByText("Gross", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Paid to studio", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Expenses", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Total Take-Home", { exact: true })).toBeVisible();

  await expect(takeHomeCard.getByText("£1,960.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£470.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£62.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£1,428.00")).toBeVisible();

  await expect(takeHomeCard.getByLabel("Gross comparison bar")).toBeVisible();
  await expect(takeHomeCard.getByLabel("Paid to studio comparison bar")).toBeVisible();
  await expect(takeHomeCard.getByLabel("Expenses comparison bar")).toBeVisible();
  await expect(takeHomeCard.getByLabel("Total Take-Home comparison bar")).toBeVisible();

  await expect(takeHomeCard.getByText("100%", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("73%", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("24%", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("3%", { exact: true })).toBeVisible();

  const avgProfitTitle = page.getByText("Average profit per session", { exact: true });
  await expect(avgProfitTitle).toBeVisible();
  const avgProfitCard = avgProfitTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();
  await expect(avgProfitCard.getByText("£142.80")).toBeVisible();
  await expect(avgProfitCard.getByText("Sessions this month: 10", { exact: true })).toBeVisible();

  const retentionTitle = page.getByText("Lifetime client retention rate", { exact: true });
  await expect(retentionTitle).toBeVisible();
  const retentionCard = retentionTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();

  await expect(retentionCard.getByText("100%", { exact: true })).toBeVisible();
  await expect(retentionCard.getByText("7 of 7 clients have returned.", { exact: true })).toBeVisible();
});

test("renders safe zero retention state when no month sessions exist", async ({ page }) => {
  const email = `dashboard-retention-${Date.now()}@${mailboxDomain}`;
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();
  expect(analyticsPayload.retention).toEqual({
    numerator: 0,
    denominator: 0,
    rate: 0,
  });
  expect(analyticsPayload.averageProfitPerSession).toEqual({
    sessionCount: 0,
    valueMinor: 0,
  });

  const retentionTitle = page.getByText("Lifetime client retention rate", { exact: true });
  await expect(retentionTitle).toBeVisible();
  const retentionCard = retentionTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();

  await expect(retentionCard.getByText("No data yet for this month.", { exact: true })).toBeVisible();
  await expect(retentionCard.getByText("0%", { exact: true })).toHaveCount(0);

  const avgProfitTitle = page.getByText("Average profit per session", { exact: true });
  await expect(avgProfitTitle).toBeVisible();
  const avgProfitCard = avgProfitTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();
  await expect(avgProfitCard.getByText("No data yet for this month.", { exact: true })).toBeVisible();
});

test("average profit card shows correct computed value for known sessions", async ({ page }) => {
  // Fresh user with no chair rent: net = gross, avg = gross / session_count
  const email = `dashboard-avg-profit-${Date.now()}@${mailboxDomain}`;
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // Three sessions: £150 + £200 + £100 = £450 gross = £450 net (no chair rent, no expenses)
  // Average = trunc(45000 / 3) = 15000 minor = £150.00
  await createSessionWithNewClient(page, {
    clientName: "Avg Client A",
    hours: "1",
    minutes: "30",
    price: "150.00",
  });
  await createSessionWithExistingClient(page, {
    clientName: "Avg Client A",
    hours: "2",
    minutes: "0",
    price: "200.00",
  });
  await createSessionWithNewClient(page, {
    clientName: "Avg Client B",
    hours: "1",
    minutes: "0",
    price: "100.00",
  });

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();

  expect(analyticsPayload.averageProfitPerSession.sessionCount).toBe(3);
  // net = gross (no chair rent, no expenses); gross = 45000 minor; avg = trunc(45000/3) = 15000
  expect(analyticsPayload.averageProfitPerSession.valueMinor).toBe(
    Math.trunc(analyticsPayload.takeHome.netMinor / analyticsPayload.averageProfitPerSession.sessionCount),
  );
  expect(analyticsPayload.takeHome.netMinor).toBe(45000);
  expect(analyticsPayload.averageProfitPerSession.valueMinor).toBe(15000);

  await page.goto("/dashboard");
  const avgProfitTitle = page.getByText("Average profit per session", { exact: true });
  await expect(avgProfitTitle).toBeVisible();
  const avgProfitCard = avgProfitTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();
  await expect(avgProfitCard.getByText("£150.00")).toBeVisible();
  await expect(avgProfitCard.getByText("Sessions this month: 3", { exact: true })).toBeVisible();
});

test("average profit card reflects truncated integer division for non-round values", async ({ page }) => {
  // Verifies floor-toward-zero division: £1,000 / 3 sessions = £333.33 → trunc = 33333 minor = £333.33
  const email = `dashboard-avg-trunc-${Date.now()}@${mailboxDomain}`;
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // Prices chosen so the sum is not evenly divisible by session count:
  // £300 + £400 + £300 = £1000 gross; trunc(100000 / 3) = 33333 minor = £333.33
  await createSessionWithNewClient(page, {
    clientName: "Trunc Client A",
    hours: "3",
    minutes: "0",
    price: "300.00",
  });
  await createSessionWithExistingClient(page, {
    clientName: "Trunc Client A",
    hours: "4",
    minutes: "0",
    price: "400.00",
  });
  await createSessionWithNewClient(page, {
    clientName: "Trunc Client B",
    hours: "3",
    minutes: "0",
    price: "300.00",
  });

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();

  expect(analyticsPayload.averageProfitPerSession.sessionCount).toBe(3);
  expect(analyticsPayload.takeHome.netMinor).toBe(100000);
  // Truncated, not rounded: 100000 / 3 = 33333.33… → 33333
  expect(analyticsPayload.averageProfitPerSession.valueMinor).toBe(33333);

  await page.goto("/dashboard");
  const avgProfitTitle = page.getByText("Average profit per session", { exact: true });
  const avgProfitCard = avgProfitTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();
  await expect(avgProfitCard.getByText("£333.33")).toBeVisible();
  await expect(avgProfitCard.getByText("Sessions this month: 3", { exact: true })).toBeVisible();
});
