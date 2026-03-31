import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_NAV_ITEMS,
  isNavItemActive,
  mapNavItemsWithState,
} from "./app-nav-utils";

test("dashboard is active only on exact dashboard route", () => {
  const dashboardItem = APP_NAV_ITEMS.find((item) => item.key === "dashboard");
  assert.ok(dashboardItem);

  assert.equal(isNavItemActive(dashboardItem, "/dashboard"), true);
  assert.equal(isNavItemActive(dashboardItem, "/dashboard/sessions"), false);
});

test("sessions is active on sessions route and nested routes", () => {
  const sessionsItem = APP_NAV_ITEMS.find((item) => item.key === "sessions");
  assert.ok(sessionsItem);

  assert.equal(isNavItemActive(sessionsItem, "/dashboard/sessions"), true);
  assert.equal(isNavItemActive(sessionsItem, "/dashboard/sessions/abc"), true);
  assert.equal(isNavItemActive(sessionsItem, "/dashboard"), false);
});

test("clients placeholder and logout action are never active", () => {
  const clientsItem = APP_NAV_ITEMS.find((item) => item.key === "clients");
  const logoutItem = APP_NAV_ITEMS.find((item) => item.key === "logout");
  assert.ok(clientsItem);
  assert.ok(logoutItem);

  assert.equal(isNavItemActive(clientsItem, "/dashboard"), false);
  assert.equal(isNavItemActive(logoutItem, "/dashboard"), false);
});

test("maps nav items with active state for current path", () => {
  const states = mapNavItemsWithState("/dashboard/sessions");
  const dashboardState = states.find((item) => item.key === "dashboard");
  const sessionsState = states.find((item) => item.key === "sessions");

  assert.equal(dashboardState?.isActive, false);
  assert.equal(sessionsState?.isActive, true);
});
