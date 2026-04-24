import { expect, test } from "@playwright/test";
import { formatDateTimeLocalForTimezone } from "@/lib/timezones";
import { loginAsSeededUser } from "./auth-helpers";
import {
  cancelDeleteSession,
  confirmDeleteSession,
  createSessionWithExistingClient,
  createSessionWithNewClient,
  editSessionFromSessionsPage,
  expectSessionNotVisible,
  expectSessionVisible,
  goToSessionsPage,
  openDeleteSessionModalFromSessionsPage,
  openAddSessionModal,
} from "./session-helpers";

function uniqueClientName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

function sessionDateTimeMinutesAgo(minutes: number): string {
  const timestamp = Date.now() - minutes * 60_000;
  return formatDateTimeLocalForTimezone(new Date(timestamp), "Europe/London");
}

function sessionDateTimeDaysAgo(days: number): string {
  const timestamp = Date.now() - days * 24 * 60 * 60_000;
  return formatDateTimeLocalForTimezone(new Date(timestamp), "Europe/London");
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

test("creates a session backdated within six months", async ({ page }) => {
  const clientName = uniqueClientName("client-backdate");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "5",
    price: "130.00",
    sessionDateTime: sessionDateTimeDaysAgo(120),
  });

  await goToSessionsPage(page);
  await page.getByRole("button", { name: /date range:/i }).click();
  await page.getByRole("menuitem", { name: /^all time$/i }).click();
  await expectSessionVisible(page, {
    clientName,
    priceMinor: 13_000,
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
    priceMinor: 34_050,
  });
});

test("edits a session from the sessions page", async ({ page }) => {
  const clientName = uniqueClientName("client-edit");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "30",
    price: "150.00",
  });

  await goToSessionsPage(page);
  await editSessionFromSessionsPage(page, {
    clientName,
    hours: "2",
    minutes: "0",
    price: "220.00",
    sessionDateTime: sessionDateTimeMinutesAgo(5),
  });
  await expectSessionVisible(page, {
    clientName,
    priceMinor: 22_000,
  });
});

test("cancels delete from the sessions page", async ({ page }) => {
  const clientName = uniqueClientName("client-delete-cancel");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "10",
    price: "95.00",
  });

  await goToSessionsPage(page);
  await openDeleteSessionModalFromSessionsPage(page, clientName);
  await cancelDeleteSession(page);
  await expectSessionVisible(page, {
    clientName,
    priceMinor: 9_500,
  });
});

test("deletes a session from the sessions page", async ({ page }) => {
  const clientName = uniqueClientName("client-delete-confirm");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "0",
    minutes: "55",
    price: "110.00",
  });

  await goToSessionsPage(page);
  await openDeleteSessionModalFromSessionsPage(page, clientName);
  await confirmDeleteSession(page);
  await expectSessionNotVisible(page, { clientName });
});

test("shows mobile session card actions for edit and delete", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const clientName = uniqueClientName("client-mobile-actions");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "20",
    price: "140.00",
  });

  await goToSessionsPage(page);
  await expect(
    page.getByRole("button", { name: `Edit session for ${clientName}` }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Delete session for ${clientName}` }).first(),
  ).toBeVisible();
});

test("shows follow-up session checkbox unchecked by default in add modal", async ({ page }) => {
  await openAddSessionModal(page);
  const checkbox = page.getByLabel("Follow-up session needed");
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();
});

test("saves session with follow-up session checkbox checked", async ({ page }) => {
  const clientName = uniqueClientName("client-in-progress");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "0",
    price: "100.00",
    inProgress: true,
  });
});

test("follow-up checkbox resets to unchecked after saving a session", async ({ page }) => {
  const clientName = uniqueClientName("client-reset-checkbox");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "0",
    price: "100.00",
    inProgress: true,
  });

  await openAddSessionModal(page);
  const checkbox = page.getByLabel("Follow-up session needed");
  await expect(checkbox).not.toBeChecked();
});

test("edit modal shows follow-up checkbox pre-populated from saved value", async ({ page }) => {
  const clientName = uniqueClientName("client-edit-in-progress");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "0",
    price: "100.00",
    inProgress: true,
  });

  await goToSessionsPage(page);
  const row = page.locator("tbody tr", { hasText: clientName }).first();
  await row.getByRole("button", { name: `Edit session for ${clientName}` }).click();

  const dialog = page.getByRole("dialog", { name: /edit session/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Follow-up session needed")).toBeChecked();
});

test("edit modal can uncheck follow-up and save", async ({ page }) => {
  const clientName = uniqueClientName("client-uncheck-in-progress");

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "0",
    price: "100.00",
    inProgress: true,
  });

  await goToSessionsPage(page);
  const row = page.locator("tbody tr", { hasText: clientName }).first();
  await row.getByRole("button", { name: `Edit session for ${clientName}` }).click();

  const dialog = page.getByRole("dialog", { name: /edit session/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Follow-up session needed").uncheck();
  await dialog.getByRole("button", { name: /^confirm$/i }).click();
  await expect(page.getByRole("status")).toContainText("Session updated successfully.");
});

test("keeps create session modal within mobile viewport bounds", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAddSessionModal(page);
  await expect(page.getByText("You can backdate sessions by up to 6 months.")).toBeVisible();
  await expect(page.getByLabel("Session date and time")).toBeVisible();

  const viewportMetrics = await page.evaluate(() => {
    return {
      viewportWidth: window.innerWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });

  expect(Math.max(viewportMetrics.htmlScrollWidth, viewportMetrics.bodyScrollWidth)).toBeLessThanOrEqual(
    viewportMetrics.viewportWidth + 1,
  );
});
