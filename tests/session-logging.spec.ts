import { expect, test } from "@playwright/test";
import {
  DEFAULT_MAILBOX_DOMAIN,
  DEFAULT_SIGN_UP_PASSWORD,
} from "./constants";
import { signUpAndConfirmUser } from "./auth-helpers";
import {
  createSessionWithExistingClient,
  createSessionWithNewClient,
  expectSessionVisible,
  goToSessionsPage,
  openAddSessionModal,
} from "./session-helpers";

const signUpPassword =
  process.env.E2E_SIGN_UP_PASSWORD ?? DEFAULT_SIGN_UP_PASSWORD;
const mailboxDomain = process.env.E2E_MAILBOX_DOMAIN ?? DEFAULT_MAILBOX_DOMAIN;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}@${mailboxDomain}`;
}

function uniqueClientName(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

test("creates a session from dashboard", async ({ page }) => {
  const email = uniqueEmail("session-create");
  const clientName = uniqueClientName("client-create");

  await signUpAndConfirmUser(page, email, signUpPassword);

  await createSessionWithNewClient(page, {
    clientName,
    hours: "1",
    minutes: "30",
    price: "125.50",
  });
});

test("creates a new client while creating a session", async ({ page }) => {
  const email = uniqueEmail("session-new-client");
  const clientName = uniqueClientName("client-new");

  await signUpAndConfirmUser(page, email, signUpPassword);

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
  const email = uniqueEmail("session-existing-client");
  const clientName = uniqueClientName("client-existing");

  await signUpAndConfirmUser(page, email, signUpPassword);

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
  const email = uniqueEmail("session-view");
  const clientName = uniqueClientName("client-view");

  await signUpAndConfirmUser(page, email, signUpPassword);

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
