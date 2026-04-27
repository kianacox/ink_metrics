# Actions Tab UI — PR 4c: E2e Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full Playwright e2e coverage for the Actions tab — tab layout, empty state, card interactions (template expand/copy, dismiss animation), and Insights tab regression.

**Architecture:** Two test strategies:
- **Real data** — tab layout and empty state tests use the seeded `sessionComplete` user (display_name: "Seeded Session User", no sessions → no signals → real empty state).
- **Mocked API** — card interaction tests intercept `/api/dashboard/actions` via `page.route()` to return a controlled action, avoiding the 8-week signal threshold that real seed data can't satisfy without special-casing dates.

**Tech Stack:** Playwright

**Depends on:** PR 4b merged and deployed locally (dashboard has tab bar + ActionsView + ActionCard rendered)

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `tests/actions-helpers.ts` | Create | Navigation helpers + mock action factory + route interceptors |
| `tests/actions-ui.spec.ts` | Create | Full e2e spec |

No existing files are modified in this PR.

---

## Task 1: Playwright helpers

**Files:**
- Create: `tests/actions-helpers.ts`

- [ ] **Step 1: Create tests/actions-helpers.ts**

```ts
import { type Page } from "@playwright/test";
import type { Action } from "@/components/dashboard/actions/action-card";

export async function goToDashboardActionsTab(page: Page): Promise<void> {
  await page.goto("/dashboard?tab=actions");
  await page.waitForLoadState("networkidle");
}

export async function goToDashboardInsightsTab(page: Page): Promise<void> {
  await page.goto("/dashboard?tab=insights");
  await page.waitForLoadState("networkidle");
}

export function makeMockAction(overrides: Partial<Action> = {}): Action {
  return {
    actionId: "mock-action-id-1",
    clientId: "mock-client-id-1",
    clientName: "Test Client",
    actionType: "lapsed_repeat",
    weeksSince: 10,
    revenueAtRiskMinor: 15000,
    messageTemplate:
      "Hey Test Client! It's been a while — hope you're well.\n" +
      "I've got some availability coming up if you've been thinking about\n" +
      "your next piece. Let me know if you'd like to get something booked in!",
    ...overrides,
  };
}

export async function interceptActionsWithMock(
  page: Page,
  actions: Action[],
): Promise<void> {
  await page.route("/api/dashboard/actions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ actions }),
    });
  });
}

export async function interceptDismissWithSuccess(
  page: Page,
  actionId: string,
): Promise<void> {
  await page.route(
    `/api/dashboard/actions/${actionId}/dismiss`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    },
  );
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint -- --max-warnings=0 tests/actions-helpers.ts`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tests/actions-helpers.ts
git commit -m "test(actions): add Playwright helpers for actions tab e2e tests"
```

---

## Task 2: E2e spec

**Files:**
- Create: `tests/actions-ui.spec.ts`

The seeded `sessionComplete` user has `display_name = "Seeded Session User"` and no sessions, so `GET /api/dashboard/actions` returns `{ actions: [] }` for that user. This gives a reliable empty state without mocking.

For card interaction tests, `page.route()` intercepts the actions API before navigation so the mock is in place when `ActionsView` mounts and fetches. Playwright's `page.route()` is last-registered-wins, so the `dismissed action does not reappear` test registers a second handler that overrides the beforeEach handler from the second call onward.

- [ ] **Step 1: Create tests/actions-ui.spec.ts**

```ts
import { expect, test } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";
import {
  goToDashboardActionsTab,
  goToDashboardInsightsTab,
  interceptActionsWithMock,
  interceptDismissWithSuccess,
  makeMockAction,
} from "./actions-helpers";

test.describe("Tab layout", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
  });

  test("Actions tab is selected by default on /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("tab", { name: "Actions" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Insights tab is not selected by default", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("tab", { name: "Insights" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("clicking Insights tab updates URL and shows Insights panel", async ({
    page,
  }) => {
    await goToDashboardActionsTab(page);
    await page.getByRole("tab", { name: "Insights" }).click();
    await expect(page).toHaveURL(/tab=insights/);
    await expect(page.locator("#tabpanel-insights")).toBeVisible();
    await expect(page.locator("#tabpanel-actions")).toBeHidden();
  });

  test("navigating to ?tab=insights shows Insights tab as selected", async ({
    page,
  }) => {
    await goToDashboardInsightsTab(page);
    await expect(page.getByRole("tab", { name: "Insights" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Insights tab renders existing analytics content", async ({ page }) => {
    await goToDashboardInsightsTab(page);
    await expect(page.getByText(/take.home/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Quick actions section is visible on Actions tab", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await expect(
      page.getByRole("heading", { name: /quick actions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^add session$/i }),
    ).toBeVisible();
  });

  test("Quick actions section is visible on Insights tab", async ({ page }) => {
    await goToDashboardInsightsTab(page);
    await expect(
      page.getByRole("heading", { name: /quick actions/i }),
    ).toBeVisible();
  });
});

test.describe("Empty state", () => {
  test("shows empty state when user has no qualifying actions", async ({
    page,
  }) => {
    await loginAsSeededUser(page, "sessionComplete");
    // sessionComplete user has no sessions → no signals → API returns []
    await goToDashboardActionsTab(page);
    await expect(page.getByText("All caught up")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/no actions right now/i)).toBeVisible();
  });
});

test.describe("Action cards (mocked API)", () => {
  const mockAction = makeMockAction();

  test.beforeEach(async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    await interceptActionsWithMock(page, [mockAction]);
  });

  test("renders action card with client name", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await expect(page.getByText("Test Client")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("renders correct nudge copy for lapsed_repeat", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await expect(
      page.getByText(/10 weeks since their last session/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("renders revenue at risk formatted as currency", async ({ page }) => {
    await goToDashboardActionsTab(page);
    // 15000 minor units → £150.00
    await expect(page.getByText(/£150/)).toBeVisible({ timeout: 10_000 });
  });

  test("shows greeting with user display_name", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await expect(
      page.getByText(/hey seeded session user/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("View message opens template panel", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await page.getByRole("button", { name: /view message/i }).click();
    await expect(page.getByText("Copy message")).toBeVisible();
    await expect(page.getByText(/it's been a while/i)).toBeVisible();
  });

  test("View message button label becomes Hide message when open", async ({
    page,
  }) => {
    await goToDashboardActionsTab(page);
    await page.getByRole("button", { name: /view message/i }).click();
    await expect(
      page.getByRole("button", { name: /hide message/i }),
    ).toBeVisible();
  });

  test("Hide message collapses template panel", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await page.getByRole("button", { name: /view message/i }).click();
    await expect(page.getByText("Copy message")).toBeVisible();
    await page.getByRole("button", { name: /hide message/i }).click();
    await expect(page.getByText("Copy message")).not.toBeVisible();
  });

  test("Copy message button shows Copied! feedback", async ({ page }) => {
    await goToDashboardActionsTab(page);
    await page.getByRole("button", { name: /view message/i }).click();
    await page.getByRole("button", { name: /copy message/i }).click();
    await expect(
      page.getByRole("button", { name: /copied!/i }),
    ).toBeVisible();
  });

  test("Dismiss removes card from list", async ({ page }) => {
    await interceptDismissWithSuccess(page, mockAction.actionId);
    await goToDashboardActionsTab(page);
    await expect(page.getByText("Test Client")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /dismiss/i }).click();
    await expect(page.getByText("Test Client")).not.toBeVisible({
      timeout: 8_000,
    });
  });

  test("dismissed action does not reappear when tab refetches", async ({
    page,
  }) => {
    await interceptDismissWithSuccess(page, mockAction.actionId);

    // Override the beforeEach mock: first call returns the action, second returns empty.
    // page.route() is last-registered-wins, so this handler takes priority.
    let callCount = 0;
    await page.route("/api/dashboard/actions", async (route) => {
      callCount++;
      const actions = callCount === 1 ? [mockAction] : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ actions }),
      });
    });

    await goToDashboardActionsTab(page);
    await page.getByRole("button", { name: /dismiss/i }).click();
    await expect(page.getByText("Test Client")).not.toBeVisible({
      timeout: 8_000,
    });

    // Switch to Insights then back — ActionsView remounts and refetches
    await page.getByRole("tab", { name: "Insights" }).click();
    await page.getByRole("tab", { name: "Actions" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("All caught up")).toBeVisible({
      timeout: 10_000,
    });
  });
});
```

- [ ] **Step 2: Run this spec in isolation**

Ensure Supabase and the dev server are running.

Run: `PLAYWRIGHT_SKIP_DB_RESET=1 npx playwright test actions-ui --reporter=list`

Expected: all tests pass. If `Dismiss removes card` flakes on animation timing, the timeout is already set to 8_000 ms. If it still flakes, add `await page.waitForTimeout(300)` after the Dismiss click (animation is 250 ms).

- [ ] **Step 3: Run full e2e suite for regression check**

Run: `npm run test:e2e`

Expected: all pre-existing tests still pass alongside the new spec.

- [ ] **Step 4: Commit**

```bash
git add tests/actions-ui.spec.ts
git commit -m "test(actions): add e2e tests for Actions tab UI"
```
