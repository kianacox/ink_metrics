import { expect, type Page } from "@playwright/test";

const CREATED_TOAST_TEXT = "Client created successfully.";
const UPDATED_TOAST_TEXT = "Client updated successfully.";
const DELETED_TOAST_TEXT = "Client deleted successfully.";

export async function goToClientsPage(page: Page): Promise<void> {
  await page.goto("/dashboard/clients");
  await expect(page).toHaveURL(/\/dashboard\/clients/);
  await expect(page.getByRole("heading", { name: /^clients$/i })).toBeVisible();
}

export async function openCreateClientModal(page: Page): Promise<void> {
  await page.getByTestId("create-client-fab").click();
  await expect(page.getByRole("dialog", { name: /new client/i })).toBeVisible();
}

export async function createClient(
  page: Page,
  input: { name: string; contactInfo?: string },
): Promise<void> {
  await openCreateClientModal(page);
  const dialog = page.getByRole("dialog", { name: /new client/i });
  await dialog.getByLabel("Client name").fill(input.name);
  if (input.contactInfo) {
    await dialog.getByLabel(/contact info/i).fill(input.contactInfo);
  }
  await dialog.getByRole("button", { name: /create client/i }).click();
  await expect(page.getByRole("status")).toContainText(CREATED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function editClientFromClientsPage(
  page: Page,
  currentName: string,
  updates: { name: string; contactInfo?: string },
): Promise<void> {
  await page
    .getByRole("button", { name: `Edit client ${currentName}` })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: /edit client/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Client name").fill(updates.name);
  if (updates.contactInfo !== undefined) {
    await dialog.getByLabel(/contact info/i).fill(updates.contactInfo);
  }
  await dialog.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status")).toContainText(UPDATED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function deleteClientFromClientsPage(
  page: Page,
  clientName: string,
): Promise<void> {
  await page
    .getByRole("button", { name: `Delete client ${clientName}` })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: /delete client/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /delete permanently/i }).click();
  await expect(page.getByRole("status")).toContainText(DELETED_TOAST_TEXT);
  await expect(dialog).not.toBeVisible();
}

export async function expectClientVisibleInTable(
  page: Page,
  clientName: string,
): Promise<void> {
  const row = page.locator("tbody tr", { hasText: clientName }).first();
  await expect(row).toBeVisible();
}

export async function expectClientNotVisibleInTable(
  page: Page,
  clientName: string,
): Promise<void> {
  const row = page.locator("tbody tr", { hasText: clientName });
  await expect(row).toHaveCount(0);
}
