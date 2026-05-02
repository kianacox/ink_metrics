import { expect, test } from "@playwright/test";
import { loginAsSeededUser, loginAsUser } from "./auth-helpers";
import {
  createClient,
  deleteClientFromClientsPage,
  editClientFromClientsPage,
  expectClientNotVisibleInTable,
  expectClientVisibleInTable,
  goToClientsPage,
  selectAllTimeDateRange,
  selectTierPill,
} from "./client-helpers";
import { createSessionWithNewClient } from "./session-helpers";

const DEMO_USER_EMAIL = "test@test.com";
const DEMO_USER_PASSWORD = "Password123";

function uniqueClientName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

test.beforeEach(async ({ page }) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("navigates to clients page from desktop sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: /primary/i }).first().getByRole("link", { name: /^clients$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/clients/);
  await expect(page.getByRole("heading", { name: /^clients$/i })).toBeVisible();
});

test("navigates to clients page from mobile bottom nav", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: /primary/i }).last().getByRole("link", { name: /^clients$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/clients/);
  await expect(page.getByRole("heading", { name: /^clients$/i })).toBeVisible();
});

test("creates a client via the floating action button", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const clientName = uniqueClientName("client-create");
  await goToClientsPage(page);
  await createClient(page, { name: clientName, contactInfo: "test@example.com" });
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await expectClientVisibleInTable(page, clientName);
});

test("creates a client without contact info", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const clientName = uniqueClientName("client-no-contact");
  await goToClientsPage(page);
  await createClient(page, { name: clientName });
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await expectClientVisibleInTable(page, clientName);
});

test("shows a validation error when creating a client with no name", async ({ page }) => {
  await goToClientsPage(page);
  await page.getByTestId("create-client-fab").click();
  const dialog = page.getByRole("dialog", { name: /new client/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /create client/i }).click();
  await expect(dialog.getByRole("status")).toContainText("Client name is required.");
});

test("edits a client name and contact info", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const clientName = uniqueClientName("client-edit");
  const updatedName = uniqueClientName("client-edited");
  await goToClientsPage(page);
  await createClient(page, { name: clientName });
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await editClientFromClientsPage(page, clientName, {
    name: updatedName,
    contactInfo: "updated@example.com",
  });
  await expectClientVisibleInTable(page, updatedName);
  await expectClientNotVisibleInTable(page, clientName);
});

test("deletes a client with confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const clientName = uniqueClientName("client-delete");
  await goToClientsPage(page);
  await createClient(page, { name: clientName });
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await deleteClientFromClientsPage(page, clientName);
  await expectClientNotVisibleInTable(page, clientName);
});

test("searches clients by name", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const searchPrefix = `search-${Date.now()}`;
  const matchName = `${searchPrefix}-match`;
  const otherName = `${searchPrefix}-other`;
  await goToClientsPage(page);
  await createClient(page, { name: matchName });
  await createClient(page, { name: otherName });
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();

  await page.getByRole("textbox", { name: /search clients/i }).fill(`${searchPrefix}-match`);
  await page.waitForTimeout(400); // debounce
  await expectClientVisibleInTable(page, matchName);
  await expectClientNotVisibleInTable(page, otherName);
});

test("shows client cards on mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const clientName = uniqueClientName("client-mobile");
  await page.goto("/dashboard/clients");
  await expect(page.getByRole("heading", { name: /^clients$/i })).toBeVisible();
  await page.getByTestId("create-client-fab").click();
  const dialog = page.getByRole("dialog", { name: /new client/i });
  await dialog.getByLabel("Client name").fill(clientName);
  await dialog.getByRole("button", { name: /create client/i }).click();
  await expect(page.getByRole("status")).toContainText("Client created successfully.");

  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();

  // On mobile, cards are shown instead of a table
  await expect(page.getByText(clientName).first()).toBeVisible();
});

test("redirects unauthenticated users away from clients page", async ({ page }) => {
  // Navigate without being logged in
  await page.context().clearCookies();
  await page.goto("/dashboard/clients");
  await expect(page).not.toHaveURL(/\/dashboard\/clients/);
});

test("delete button is disabled for clients linked to sessions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const clientName = uniqueClientName("client-has-session");

  // Create a session (with a new client) from the dashboard
  await createSessionWithNewClient(page, {
    clientName,
    price: "100",
  });

  // Navigate to clients page and show all time so the client is visible
  await goToClientsPage(page);
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();

  // The delete button should be disabled because the client has a linked session
  const deleteButton = page
    .getByRole("button", { name: `Delete client ${clientName}` })
    .first();
  await expect(deleteButton).toBeDisabled();
});

test("changes date range filter and updates button label", async ({ page }) => {
  await goToClientsPage(page);

  const dateRangeButton = page.getByRole("button", { name: /date range:/i });

  await dateRangeButton.click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await expect(dateRangeButton).toContainText(/date range:.*all time/i);

  await dateRangeButton.click();
  await page.getByRole("menuitem", { name: /^year to date$/i }).click();
  await expect(dateRangeButton).toContainText(/date range:.*year to date/i);
});

test.describe("tier filter pills", () => {
  // Use the demo user — it has seeded clients spanning all three tiers.
  // Lifetime tier counts (from supabase/seed.sql):
  //   VIP (5+ sessions):     Emma Wilson, Sophie Turner, James Fletcher,
  //                           Priya Patel, Marcus Reid, Chloe Andrews, Theo Brooks
  //   Regular (2–4):         Ravi Sharma, Zoe Campbell, Dana Cross
  //   One-timer (0–1):       Finn O'Connor

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // The top-level beforeEach signs us in as the seeded session user
    // (which has no clients). Clear cookies before logging in as the
    // demo user so the seeded clients with sessions are visible.
    await page.context().clearCookies();
    await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, {
      waitForDashboard: true,
    });
    await goToClientsPage(page);
    // Switch to All time so lifetime-tiered clients are guaranteed in view
    // regardless of the default 90-day window.
    await selectAllTimeDateRange(page);
  });

  test("VIP pill shows only VIP clients", async ({ page }) => {
    await selectTierPill(page, "VIP");
    await expectClientVisibleInTable(page, "Emma Wilson");
    await expectClientNotVisibleInTable(page, "Finn O'Connor");
    await expectClientNotVisibleInTable(page, "Ravi Sharma");
  });

  test("Regular pill shows only regular clients", async ({ page }) => {
    await selectTierPill(page, "Regular");
    await expectClientVisibleInTable(page, "Ravi Sharma");
    await expectClientNotVisibleInTable(page, "Emma Wilson");
    await expectClientNotVisibleInTable(page, "Finn O'Connor");
  });

  test("One-timer pill shows only one-timer clients", async ({ page }) => {
    await selectTierPill(page, "One-timer");
    await expectClientVisibleInTable(page, "Finn O'Connor");
    await expectClientNotVisibleInTable(page, "Emma Wilson");
    await expectClientNotVisibleInTable(page, "Ravi Sharma");
  });

  test("All pill restores the full client list", async ({ page }) => {
    await selectTierPill(page, "VIP");
    await expectClientNotVisibleInTable(page, "Finn O'Connor");

    await selectTierPill(page, "All");
    await expectClientVisibleInTable(page, "Emma Wilson");
    await expectClientVisibleInTable(page, "Finn O'Connor");
    await expectClientVisibleInTable(page, "Ravi Sharma");
  });

  test("tier badges are visible on client rows", async ({ page }) => {
    // Each row renders a tier badge alongside the client name. We assert
    // the VIP badge appears in Emma Wilson's row and the One-timer badge
    // appears in Finn O'Connor's row.
    const emmaRow = page.locator("tbody tr", { hasText: "Emma Wilson" }).first();
    await expect(emmaRow).toContainText("VIP");

    const finnRow = page.locator("tbody tr", { hasText: "Finn O'Connor" }).first();
    await expect(finnRow).toContainText("One-timer");

    const raviRow = page.locator("tbody tr", { hasText: "Ravi Sharma" }).first();
    await expect(raviRow).toContainText("Regular");
  });

  test("VIP pill composes with search to narrow within VIPs only", async ({ page }) => {
    await selectTierPill(page, "VIP");
    await page
      .getByRole("textbox", { name: /search clients/i })
      .fill("Emma");
    await page.waitForTimeout(400); // debounce
    await expectClientVisibleInTable(page, "Emma Wilson");
    await expectClientNotVisibleInTable(page, "Sophie Turner");
    await expectClientNotVisibleInTable(page, "Finn O'Connor");
  });
});

test.describe("tier filter pills empty state", () => {
  // Log in as the demo user and apply a search that matches no clients,
  // so every tier filter yields the tier-aware empty-state copy. This is
  // resilient to earlier tests in this file populating the session-complete
  // user with one-timer clients (which would otherwise cause the One-timer
  // assertion to fail).

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.context().clearCookies();
    await loginAsUser(page, DEMO_USER_EMAIL, DEMO_USER_PASSWORD, { waitForDashboard: true });
    await goToClientsPage(page);
  });

  test("shows tier-aware empty state when no clients match selected tier", async ({
    page,
  }) => {
    await page
      .getByRole("textbox", { name: /search clients/i })
      .fill("no-such-client-zzz-9999");

    await selectTierPill(page, "VIP");
    await expect(page.getByText("No VIP clients yet.")).toBeVisible();

    await selectTierPill(page, "Regular");
    await expect(page.getByText("No regular clients yet.")).toBeVisible();

    await selectTierPill(page, "One-timer");
    await expect(page.getByText("No one-time clients yet.")).toBeVisible();
  });
});
