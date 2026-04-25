import { expect, type Page } from "@playwright/test";

function getProfilePanel(page: Page) {
  return page.locator("#tabpanel-profile");
}

export async function openProfileTab(page: Page): Promise<void> {
  const profileTab = page.getByRole("tab", { name: /^profile$/i });
  await profileTab.click();
  await expect(profileTab).toHaveAttribute("aria-selected", "true");
  await expect(getProfilePanel(page)).toBeVisible();
}

export async function goToProfilePage(page: Page): Promise<void> {
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/dashboard\/profile/);
  await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
  await openProfileTab(page);
}

export async function saveProfileChanges(page: Page): Promise<void> {
  await getProfilePanel(page)
    .getByRole("button", { name: /^save changes$/i })
    .click();
}

export async function expectProfileStatus(
  page: Page,
  text: string | RegExp,
): Promise<void> {
  const statusEl = getProfilePanel(page).getByRole("status");
  await expect(statusEl).toBeVisible();
  await expect(statusEl).toContainText(text);
}

export async function expectProfileSuccess(page: Page): Promise<void> {
  await expectProfileStatus(page, /settings saved\.|profile updated successfully\./i);
}

// Scope a button click to the grid container that wraps a given label.
// Form structure: <div class="grid gap-2"><Label>text</Label><div>…buttons…</div></div>
function getFieldGroup(page: Page, labelText: string | RegExp) {
  const profilePanel = getProfilePanel(page);
  return profilePanel.locator("div.grid", { hasText: labelText }).first();
}

export async function selectTimezone(page: Page, timezone: string): Promise<void> {
  const input = getProfilePanel(page).locator("#profile-reporting-timezone");
  await input.focus();
  await input.fill(timezone);
  // Dropdown renders <button type="button">{timezone}</button> inside a <ul>
  await page.getByRole("button", { name: timezone }).click();
}

export async function selectChairRent(page: Page, value: "yes" | "no"): Promise<void> {
  const group = getFieldGroup(page, /do you pay chair rent\?/i);
  await group.getByRole("button", { name: value === "yes" ? /^yes$/i : /^no$/i }).click();
}

export async function selectRentType(page: Page, type: "fixed" | "commission"): Promise<void> {
  const group = getFieldGroup(page, /do you pay commission or fixed rate\?/i);
  await group.getByRole("button", { name: type === "fixed" ? /^fixed rate$/i : /^commission$/i }).click();
}

export async function selectFixedFrequency(page: Page, frequency: "weekly" | "monthly"): Promise<void> {
  const group = getFieldGroup(page, /fixed frequency/i);
  await group.getByRole("button", { name: frequency === "weekly" ? /^weekly$/i : /^monthly$/i }).click();
}

export async function selectCommissionCapped(page: Page, value: "yes" | "no"): Promise<void> {
  const group = getFieldGroup(page, /is commission capped\?/i);
  await group.getByRole("button", { name: value === "yes" ? /^yes$/i : /^no$/i }).click();
}

export async function selectCapFrequency(page: Page, frequency: "weekly" | "monthly"): Promise<void> {
  const group = getFieldGroup(page, /cap frequency/i);
  await group.getByRole("button", { name: frequency === "weekly" ? /^weekly$/i : /^monthly$/i }).click();
}
