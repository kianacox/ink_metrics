import { test, expect } from "@playwright/test";

test.describe("Contact page", () => {
  test("renders the form fields", async ({ page }) => {
    await page.goto("/contact");

    await expect(
      page.getByRole("heading", { name: /Contact us/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Subject")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send message/i }),
    ).toBeVisible();
  });

  test("shows validation errors when fields are empty", async ({ page }) => {
    await page.goto("/contact");

    await page.getByRole("button", { name: /Send message/i }).click();

    await expect(page.getByText("Name is required.")).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Please select a subject.")).toBeVisible();
    await expect(page.getByText("Message is required.")).toBeVisible();
  });

  test("shows confirmation when the API responds with success", async ({
    page,
  }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/contact");
    await page.getByLabel("Name").fill("Jane Tester");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Subject").selectOption("Billing");
    await page
      .getByLabel("Message")
      .fill("Hi, I have a billing question for inkMetrics.");
    await page.getByRole("button", { name: /Send message/i }).click();

    await expect(
      page.getByRole("heading", {
        name: /Thanks — we've got your message/i,
      }),
    ).toBeVisible();
  });

  test("shows rate-limit error when API returns 429", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Too many submissions. Please try again later.",
          code: "CONTACT_RATE_LIMITED",
        }),
      });
    });

    await page.goto("/contact");
    await page.getByLabel("Name").fill("Jane Tester");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Subject").selectOption("Bug");
    await page.getByLabel("Message").fill("Encountered a bug.");
    await page.getByRole("button", { name: /Send message/i }).click();

    await expect(
      page.getByText(/Too many submissions/i),
    ).toBeVisible();
    // Form is still present (state preserved)
    await expect(page.getByLabel("Name")).toHaveValue("Jane Tester");
  });

  test("footer links to /contact", async ({ page }) => {
    await page.goto("/");
    const footerLink = page.getByRole("link", { name: "Contact" });
    await expect(footerLink).toBeVisible();
    await footerLink.click();
    await expect(page).toHaveURL("/contact");
  });
});
