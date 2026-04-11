import { expect, type Page } from "@playwright/test";

export async function goToProfilePage(page: Page): Promise<void> {
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/dashboard\/profile/);
  await expect(page.getByRole("heading", { name: /^profile$/i })).toBeVisible();
}

export async function saveProfileChanges(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^save changes$/i }).click();
}

export async function expectProfileStatus(
  page: Page,
  text: string | RegExp,
): Promise<void> {
  const statusEl = page.getByRole("status");
  await expect(statusEl).toBeVisible();
  await expect(statusEl).toContainText(text);
}

export async function expectProfileSuccess(page: Page): Promise<void> {
  await expectProfileStatus(page, "Profile updated successfully.");
}

// Scope a button click to the grid container that wraps a given label.
// Form structure: <div class="grid gap-2"><Label>text</Label><div>…buttons…</div></div>
function getFieldGroup(page: Page, labelText: string | RegExp) {
  return page.locator("div.grid", { has: page.getByText(labelText) }).first();
}

export async function selectTimezone(page: Page, timezone: string): Promise<void> {
  const input = page.locator("#profile-reporting-timezone");
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
  const group = getFieldGroup(page, /^fixed frequency$/i);
  await group.getByRole("button", { name: frequency === "weekly" ? /^weekly$/i : /^monthly$/i }).click();
}

export async function selectCommissionCapped(page: Page, value: "yes" | "no"): Promise<void> {
  const group = getFieldGroup(page, /is commission capped\?/i);
  await group.getByRole("button", { name: value === "yes" ? /^yes$/i : /^no$/i }).click();
}

export async function selectCapFrequency(page: Page, frequency: "weekly" | "monthly"): Promise<void> {
  const group = getFieldGroup(page, /^cap frequency$/i);
  await group.getByRole("button", { name: frequency === "weekly" ? /^weekly$/i : /^monthly$/i }).click();
}
