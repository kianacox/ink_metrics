import { expect, test } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";
import {
  createClient,
  deleteClientFromClientsPage,
  editClientFromClientsPage,
  expectClientNotVisibleInTable,
  expectClientVisibleInTable,
  goToClientsPage,
} from "./client-helpers";
import { createSessionWithNewClient } from "./session-helpers";

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

test("changes date range filter and updates client count label", async ({ page }) => {
  await goToClientsPage(page);
  await expect(page.getByText(/clients in the last 90 days/i)).toBeVisible();

  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await expect(page.getByText(/clients all time/i)).toBeVisible();

  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^year to date$/i }).click();
  await expect(page.getByText(/clients year to date/i)).toBeVisible();
});

test("top client banner shows the current calendar month, not a rolling 30-day label", async ({
  page,
}) => {
  // Create a session this month so there is at least one client to surface.
  const clientName = uniqueClientName("top-client-month");
  await createSessionWithNewClient(page, {
    clientName,
    price: "150",
  });

  await goToClientsPage(page);

  // The banner should reference the current month by name (e.g. "April 2026"),
  // not a relative label like "last 30 days".
  const currentMonthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const bannerPattern = new RegExp(`top client ${currentMonthLabel}`, "i");
  await expect(page.getByText(bannerPattern)).toBeVisible();
});
