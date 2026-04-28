import { expect, test } from "@playwright/test";
import { DEFAULT_MAILBOX_DOMAIN, getSignUpPassword } from "./constants";
import { completeProfileSetupMinimal, loginAsUser, signUpAndConfirmUserOnly } from "./auth-helpers";
import { createSessionWithNewClient, createSessionWithExistingClient } from "./session-helpers";
import { createExpense, goToExpensesPage } from "./expense-helpers";

const DEMO_USER_EMAIL = "test@test.com";
const DEMO_USER_PASSWORD = "Password123";
const EXPECTED_TAKE_HOME_MINOR = {
  grossMinor: 196000,
  paidToStudioMinor: 47000,
  totalExpensesMinor: 6200,
  netMinor: 142800,
} as const;
const EXPECTED_RETENTION = {
  numerator: 10,
  denominator: 11,
  rate: 10 / 11,
  totalSessions: 49,
} as const;
const EXPECTED_AVG_PROFIT = {
  sessionCount: 10,
  valueMinor: 14280, // Math.trunc(142800 / 10)
} as const;
const signUpPassword = getSignUpPassword();
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

test("renders take-home summary values and comparative bars for seeded data", async ({ page }) => {
  await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, { waitForDashboard: true });
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

  await page.goto("/dashboard?tab=insights");

  const monthLabel = new Date().toLocaleString("en-GB", { month: "long" });

  await expect(page.getByRole("heading", { name: `${monthLabel} Performance` })).toBeVisible();
  const takeHomeTitle = page.getByText("Take-home summary", { exact: true });
  await expect(takeHomeTitle).toBeVisible();
  const takeHomeCard = takeHomeTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();

  await expect(takeHomeCard.getByText("Gross Income", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Paid to studio", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Expenses", { exact: true })).toBeVisible();
  await expect(takeHomeCard.getByText("Total Take-Home", { exact: true })).toBeVisible();

  await expect(takeHomeCard.getByText("£1,960.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£470.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£62.00")).toBeVisible();
  await expect(takeHomeCard.getByText("£1,428.00")).toBeVisible();

  await expect(takeHomeCard.getByLabel("Gross Income comparison bar")).toBeVisible();
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

  await expect(retentionCard.getByText("91%", { exact: true })).toBeVisible();
  await expect(retentionCard.getByText("10 of 11 clients have returned.", { exact: true })).toBeVisible();
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
    totalSessions: 0,
  });
  expect(analyticsPayload.averageProfitPerSession).toEqual({
    sessionCount: 0,
    valueMinor: 0,
  });

  await page.goto("/dashboard?tab=insights");

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
    price: "150.00",
  });
  await createSessionWithExistingClient(page, {
    clientName: "Avg Client A",
    price: "200.00",
  });
  await createSessionWithNewClient(page, {
    clientName: "Avg Client B",
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

  await page.goto("/dashboard?tab=insights");
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
    price: "300.00",
  });
  await createSessionWithExistingClient(page, {
    clientName: "Trunc Client A",
    price: "400.00",
  });
  await createSessionWithNewClient(page, {
    clientName: "Trunc Client B",
    price: "300.00",
  });

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();

  expect(analyticsPayload.averageProfitPerSession.sessionCount).toBe(3);
  expect(analyticsPayload.takeHome.netMinor).toBe(100000);
  // Truncated, not rounded: 100000 / 3 = 33333.33… → 33333
  expect(analyticsPayload.averageProfitPerSession.valueMinor).toBe(33333);

  await page.goto("/dashboard?tab=insights");
  const avgProfitTitle = page.getByText("Average profit per session", { exact: true });
  const avgProfitCard = avgProfitTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();
  await expect(avgProfitCard.getByText("£333.33")).toBeVisible();
  await expect(avgProfitCard.getByText("Sessions this month: 3", { exact: true })).toBeVisible();
});

test("expenses by category card shows correct API values for seeded demo user", async ({ page }) => {
  await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, { waitForDashboard: true });
  await expect(page).toHaveURL(/\/dashboard/);

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const payload = await analyticsResponse.json();

  const cartridges = payload.expensesByCategory.items.find(
    (i: { category: string }) => i.category === "cartridges",
  );
  const misc = payload.expensesByCategory.items.find(
    (i: { category: string }) => i.category === "miscellaneous",
  );
  expect(cartridges?.totalMinor).toBe(2800);
  expect(misc?.totalMinor).toBe(3400);
  expect(payload.expensesByCategory.totalMinor).toBe(6200);
  expect(payload.expensesByCategory.items).toHaveLength(7);
});

test("expenses by category card renders category amounts and total for seeded demo user", async ({ page }) => {
  await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, { waitForDashboard: true });
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard?tab=insights");

  const cardTitle = page.getByText("Expenses by category", { exact: true });
  await expect(cardTitle).toBeVisible();
  const card = cardTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();

  const cartridgesItem = card.getByRole("listitem").filter({ hasText: "Cartridges" });
  await expect(cartridgesItem).toBeVisible();
  await expect(cartridgesItem).toContainText("£28.00");

  const miscItem = card.getByRole("listitem").filter({ hasText: "Miscellaneous" });
  await expect(miscItem).toBeVisible();
  await expect(miscItem).toContainText("£34.00");

  await expect(card.getByLabel("Total expenses")).toBeVisible();
  await expect(card.getByLabel("Total expenses")).toContainText("£62.00");

  await expect(card.getByRole("img", { name: "Cartridges expense bar" })).toBeVisible();
  await expect(card.getByRole("img", { name: "Miscellaneous expense bar" })).toBeVisible();
});

test("expenses by category card renders all seven category rows for seeded demo user", async ({ page }) => {
  await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, { waitForDashboard: true });
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard?tab=insights");

  const cardTitle = page.getByText("Expenses by category", { exact: true });
  const card = cardTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();

  for (const label of ["Ink", "Cartridges", "Needles", "Machines", "Other equipment", "Travel", "Miscellaneous"]) {
    await expect(card.getByText(label, { exact: true })).toBeVisible();
  }
});

test("expenses by category card shows friendly empty state when sessions exist but no expenses", async ({ page }) => {
  const email = `dashboard-no-expenses-${Date.now()}@${mailboxDomain}`;
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  await createSessionWithNewClient(page, {
    clientName: "Solo Client",
    price: "200.00",
  });

  await page.goto("/dashboard?tab=insights");

  const cardTitle = page.getByText("Expenses by category", { exact: true });
  await expect(cardTitle).toBeVisible();
  const card = cardTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();

  await expect(card.getByText("No expenses recorded this month.", { exact: true })).toBeVisible();
});

test("expenses by category card shows correct values after adding expenses via UI", async ({ page }) => {
  const email = `dashboard-expenses-${Date.now()}@${mailboxDomain}`;
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  await goToExpensesPage(page);
  await createExpense(page, { item: "Black ink bottle", category: "Ink", amount: "25.00" });
  await createExpense(page, { item: "Needle pack", category: "Needles", amount: "15.00" });

  await page.goto("/dashboard?tab=insights");

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const payload = await analyticsResponse.json();

  const ink = payload.expensesByCategory.items.find(
    (i: { category: string }) => i.category === "ink",
  );
  const needles = payload.expensesByCategory.items.find(
    (i: { category: string }) => i.category === "needles",
  );
  expect(ink?.totalMinor).toBe(2500);
  expect(needles?.totalMinor).toBe(1500);
  expect(payload.expensesByCategory.totalMinor).toBe(4000);

  const cardTitle = page.getByText("Expenses by category", { exact: true });
  const card = cardTitle.locator("xpath=ancestor::div[contains(@class,'h-full')]").first();
  await expect(card.getByText("£25.00")).toBeVisible();
  await expect(card.getByText("£15.00")).toBeVisible();
  await expect(card.getByLabel("Total expenses")).toContainText("£40.00");
});

test("retention card shows insufficient data message when user has too few sessions or clients", async ({ page }) => {
  const email = `dashboard-retention-thin-${Date.now()}@${mailboxDomain}`;
  await signUpAndConfirmUserOnly(page, email, signUpPassword);
  await expect(page).toHaveURL(/\/dashboard\/profile-setup/);
  await completeProfileSetupMinimal(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // 2 sessions, 2 clients — below both thresholds (< 4 sessions OR < 3 clients)
  await createSessionWithNewClient(page, { clientName: "Thin Client A", price: "100.00" });
  await createSessionWithNewClient(page, { clientName: "Thin Client B", price: "150.00" });

  const analyticsResponse = await page.request.get("/api/dashboard/analytics?month=current");
  expect(analyticsResponse.ok()).toBeTruthy();
  const analyticsPayload = await analyticsResponse.json();
  expect(analyticsPayload.retention.totalSessions).toBe(2);
  expect(analyticsPayload.retention.denominator).toBe(2);

  await page.goto("/dashboard?tab=insights");

  const retentionTitle = page.getByText("Lifetime client retention rate", { exact: true });
  await expect(retentionTitle).toBeVisible();
  const retentionCard = retentionTitle
    .locator("xpath=ancestor::div[contains(@class,'h-full')]")
    .first();

  await expect(
    retentionCard.getByText(
      "Please log more clients and sessions to make use of this metric.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(retentionCard.getByText("%", { exact: false })).toHaveCount(0);
});
