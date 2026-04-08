import { expect, test } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";
import {
  createSessionWithExistingClient,
  createSessionWithNewClient,
  expectSessionVisible,
  goToSessionsPage,
  openAddSessionModal,
} from "./session-helpers";

function uniqueClientName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

test.beforeEach(async ({ page }) => {
  await loginAsSeededUser(page, "sessionComplete");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("creates a session from dashboard", async ({ page }) => {
  const clientName = uniqueClientName("client-create");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "30",
    price: "125.50",
  });
});

test("creates a new client while creating a session", async ({ page }) => {
  const clientName = uniqueClientName("client-new");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "0",
    minutes: "45",
    price: "80.00",
  });

  await openAddSessionModal(page);
  await page.getByLabel("Client (type to search existing or create new)").fill(clientName);
  await expect(
    page.getByRole("button", { name: `Use existing: ${clientName}` }),
  ).toBeVisible();
});

test("selects an existing client when creating a session", async ({ page }) => {
  const clientName = uniqueClientName("client-existing");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "0",
    price: "100.00",
  });

  await createSessionWithExistingClient(page, {
    clientName,
    hours: "2",
    minutes: "15",
    price: "220.00",
  });
});

test("views a created session on the sessions page", async ({ page }) => {
  const clientName = uniqueClientName("client-view");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "2",
    minutes: "30",
    price: "340.50",
  });

  await goToSessionsPage(page);
  await expectSessionVisible(page, {
    clientName,
    durationMinutes: 150,
    priceMinor: 34_050,
  });
});
