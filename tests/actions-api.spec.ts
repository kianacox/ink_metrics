import { expect, test } from "@playwright/test";
import { loginAsSeededUser } from "./auth-helpers";

test.describe("GET /api/dashboard/actions", () => {
  test("returns 401 when unauthenticated", async ({ page }) => {
    const response = await page.request.get("/api/dashboard/actions");
    expect(response.status()).toBe(401);
  });

  test("returns actions array for authenticated user", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    const response = await page.request.get("/api/dashboard/actions");
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload).toHaveProperty("actions");
    expect(Array.isArray(payload.actions)).toBe(true);
  });

  test("each action has required response fields", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    const response = await page.request.get("/api/dashboard/actions");
    const payload = await response.json();

    for (const action of payload.actions) {
      expect(action).toMatchObject({
        actionId: expect.any(String),
        clientId: expect.any(String),
        clientName: expect.any(String),
        actionType: expect.stringMatching(/^(lapsed_repeat|new_client|in_progress)$/),
        weeksSince: expect.any(Number),
        revenueAtRiskMinor: expect.any(Number),
        messageTemplate: expect.any(String),
      });
    }
  });

  test("actions are ordered by revenueAtRiskMinor descending", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    const response = await page.request.get("/api/dashboard/actions");
    const { actions } = await response.json();

    for (let i = 1; i < actions.length; i++) {
      expect(actions[i - 1].revenueAtRiskMinor).toBeGreaterThanOrEqual(
        actions[i].revenueAtRiskMinor,
      );
    }
  });

  test("is idempotent — calling twice does not duplicate actions", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    const first = await (await page.request.get("/api/dashboard/actions")).json();
    const second = await (await page.request.get("/api/dashboard/actions")).json();

    expect(second.actions.length).toBe(first.actions.length);
    const firstIds = first.actions.map((a: { actionId: string }) => a.actionId).sort();
    const secondIds = second.actions.map((a: { actionId: string }) => a.actionId).sort();
    expect(secondIds).toEqual(firstIds);
  });
});

test.describe("POST /api/dashboard/actions/[actionId]/dismiss", () => {
  test("returns 401 when unauthenticated", async ({ page }) => {
    const response = await page.request.post("/api/dashboard/actions/nonexistent/dismiss");
    expect(response.status()).toBe(401);
  });

  test("returns 404 for unknown actionId", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");
    const response = await page.request.post(
      "/api/dashboard/actions/00000000-0000-0000-0000-000000000000/dismiss",
    );
    expect(response.status()).toBe(404);
    const payload = await response.json();
    expect(payload.code).toBe("ACTION_NOT_FOUND");
  });

  test("dismisses action and removes it from active list", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");

    const actionsResponse = await page.request.get("/api/dashboard/actions");
    const { actions } = await actionsResponse.json();

    if (actions.length === 0) {
      test.skip();
      return;
    }

    const target = actions[0];
    const dismissResponse = await page.request.post(
      `/api/dashboard/actions/${target.actionId}/dismiss`,
    );
    expect(dismissResponse.ok()).toBeTruthy();
    const dismissPayload = await dismissResponse.json();
    expect(dismissPayload.success).toBe(true);

    const afterResponse = await page.request.get("/api/dashboard/actions");
    const after = await afterResponse.json();
    const stillPresent = after.actions.some(
      (a: { actionId: string }) => a.actionId === target.actionId,
    );
    expect(stillPresent).toBe(false);
  });

  test("dismissed action does not reappear on subsequent load", async ({ page }) => {
    await loginAsSeededUser(page, "sessionComplete");

    const { actions } = await (await page.request.get("/api/dashboard/actions")).json();
    if (actions.length === 0) {
      test.skip();
      return;
    }

    const target = actions[0];
    await page.request.post(`/api/dashboard/actions/${target.actionId}/dismiss`);

    for (let i = 0; i < 2; i++) {
      const { actions: reloaded } = await (await page.request.get("/api/dashboard/actions")).json();
      expect(
        reloaded.some((a: { actionId: string }) => a.actionId === target.actionId),
      ).toBe(false);
    }
  });
});
