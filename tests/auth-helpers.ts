import { expect, type Page } from "@playwright/test";
import {
  DEFAULT_INBUCKET_BASE_URL,
  DEFAULT_SEEDED_INCOMPLETE_USER_EMAIL,
  DEFAULT_SEEDED_SESSION_USER_EMAIL,
  DEFAULT_SEEDED_TZ_USER_EMAIL,
  DEFAULT_PLAYWRIGHT_BASE_URL,
  getSeededUserPassword,
} from "./constants";

const inbucketBaseUrl =
  process.env.INBUCKET_BASE_URL ?? DEFAULT_INBUCKET_BASE_URL;
const appBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_PLAYWRIGHT_BASE_URL;
const seededSessionUserEmail =
  process.env.E2E_SEEDED_SESSION_USER_EMAIL ?? DEFAULT_SEEDED_SESSION_USER_EMAIL;
const seededIncompleteUserEmail =
  process.env.E2E_SEEDED_INCOMPLETE_USER_EMAIL ?? DEFAULT_SEEDED_INCOMPLETE_USER_EMAIL;
const seededTzUserEmail =
  process.env.E2E_SEEDED_TZ_USER_EMAIL ?? DEFAULT_SEEDED_TZ_USER_EMAIL;
const seededUserPassword = getSeededUserPassword();

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

function extractConfirmationLink(message: unknown): string | null {
  const allText = collectStrings(message)
    .join("\n")
    .replaceAll("&amp;", "&");
  const match = allText.match(
    /(https?:\/\/[^\s"'<>]*(?:\/auth\/v1\/verify|\/auth\/confirm)\?[^\s"'<>]*)/i,
  );

  return match?.[1] ?? null;
}

function localMailboxName(email: string): string {
  return email.split("@")[0] ?? email;
}

async function clickFirstVisibleButton(page: Page, namePattern: RegExp) {
  const buttons = page.getByRole("button", { name: namePattern });
  const buttonCount = await buttons.count();
  for (let index = 0; index < buttonCount; index += 1) {
    const candidateButton = buttons.nth(index);
    if (await candidateButton.isVisible()) {
      await candidateButton.click();
      return;
    }
  }
  throw new Error(`Could not find visible button matching ${namePattern.toString()}`);
}

async function hasVisibleButton(page: Page, namePattern: RegExp): Promise<boolean> {
  const buttons = page.getByRole("button", { name: namePattern });
  const buttonCount = await buttons.count();
  for (let index = 0; index < buttonCount; index += 1) {
    if (await buttons.nth(index).isVisible()) {
      return true;
    }
  }
  return false;
}

export async function completeProfileSetupMinimal(
  page: Page,
  email: string,
  options: {
    marketingConsent?: boolean;
  } = {},
): Promise<void> {
  const marketingConsent = options.marketingConsent ?? false;
  await page.waitForLoadState("networkidle");

  const profileHeading = page.getByRole("heading", { name: /set up your profile/i });
  await expect(profileHeading).toBeVisible();
  await page.locator("#profile-name:visible").fill(localMailboxName(email));

  const isDesktopFlow = (await hasVisibleButton(page, /^finish setup$/i)) &&
    !(await hasVisibleButton(page, /^next$/i));

  if (isDesktopFlow) {
    await clickFirstVisibleButton(page, /^no$/i);
    if (marketingConsent) {
      await page.locator("#marketing-consent").click();
    }
    await clickFirstVisibleButton(page, /^finish setup$/i);
  } else {
    await page.getByRole("button", { name: /^next$/i }).click();
    await clickFirstVisibleButton(page, /^no$/i);
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^next$/i }).click();
    if (marketingConsent) {
      await page.locator("#marketing-consent").click();
    }
    await page.getByRole("button", { name: /^finish setup$/i }).click();
  }

  await expect(page.getByText(/you.re all setup! welcome to inkmetrics/i)).toBeVisible();
  await page.getByRole("button", { name: /continue to dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function clearMailbox(email: string): Promise<void> {
  const mailbox = localMailboxName(email);
  const response = await fetch(
    `${inbucketBaseUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}`,
    { method: "DELETE" },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to clear mailbox ${mailbox}. Status: ${response.status}`,
    );
  }
}

export async function fetchConfirmationLink(
  email: string,
  timeoutMs = 30_000,
): Promise<string> {
  const mailbox = localMailboxName(email);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const mailboxResponse = await fetch(
      `${inbucketBaseUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}`,
    );

    if (mailboxResponse.ok) {
      const mailboxMessages = (await mailboxResponse.json()) as Array<{
        id?: string;
      }>;

      for (const message of mailboxMessages) {
        if (!message.id) {
          continue;
        }

        const messageResponse = await fetch(
          `${inbucketBaseUrl}/api/v1/mailbox/${encodeURIComponent(mailbox)}/${message.id}`,
        );

        if (!messageResponse.ok) {
          continue;
        }

        const fullMessage = await messageResponse.json();
        const confirmationLink = extractConfirmationLink(fullMessage);

        if (confirmationLink) {
          return confirmationLink;
        }
      }
    } else {
      const mailpitResponse = await fetch(`${inbucketBaseUrl}/api/v1/messages`);

      if (mailpitResponse.ok) {
        const mailpitBody = (await mailpitResponse.json()) as {
          messages?: Array<{
            ID?: string;
            To?: Array<{ Address?: string }>;
          }>;
        };

        const candidateMessages = (mailpitBody.messages ?? []).filter(
          (message) =>
            (message.To ?? []).some((recipient) => recipient.Address === email),
        );

        for (const message of candidateMessages) {
          if (!message.ID) {
            continue;
          }

          const messageResponse = await fetch(
            `${inbucketBaseUrl}/api/v1/message/${message.ID}`,
          );

          if (!messageResponse.ok) {
            continue;
          }

          const fullMessage = await messageResponse.json();
          const confirmationLink = extractConfirmationLink(fullMessage);

          if (confirmationLink) {
            return confirmationLink;
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `No confirmation link found for ${email} within ${timeoutMs}ms.`,
  );
}

export async function signUpAndConfirmUserOnly(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await clearMailbox(email);

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Repeat Password").fill(password);
  await page.getByRole("checkbox", { name: /terms and conditions/i }).click();
  await page.getByRole("button", { name: /^sign up$/i }).click();

  const confirmationLink = await fetchConfirmationLink(email);
  const verificationUrl = new URL(confirmationLink);
  if (verificationUrl.pathname.includes("/auth/v1/verify")) {
    verificationUrl.searchParams.set("redirect_to", `${appBaseUrl}/dashboard`);
  }

  await page.goto(verificationUrl.toString());
  if (page.url().includes("/auth/login")) {
    await loginAsUser(page, email, password);
  }
}

export async function signUpAndConfirmUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await signUpAndConfirmUserOnly(page, email, password);

  if (page.url().includes("/dashboard/profile-setup")) {
    await completeProfileSetupMinimal(page, email);
  }

  await expect(page).toHaveURL(/\/dashboard/);
}

export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
  { waitForDashboard = false }: { waitForDashboard?: boolean } = {},
) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^login$/i }).click();
  if (waitForDashboard) {
    // Wait for post-login redirect to complete so callers don't race against navigation.
    await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  }
}

export async function loginAsSeededUser(
  page: Page,
  userType: "sessionComplete" | "incomplete" | "timezone" = "sessionComplete",
) {
  const email =
    userType === "sessionComplete" ? seededSessionUserEmail
    : userType === "timezone" ? seededTzUserEmail
    : seededIncompleteUserEmail;
  await loginAsUser(page, email, seededUserPassword, { waitForDashboard: true });
  return email;
}
