import {
  APP_NAV_ITEMS,
  isNavItemActive,
  mapNavItemsWithState,
} from "./app-nav-utils";

describe("app-nav-utils", () => {
  it("dashboard is active only on exact dashboard route", () => {
    const dashboardItem = APP_NAV_ITEMS.find((item) => item.key === "dashboard");
    expect(dashboardItem).toBeTruthy();

    if (!dashboardItem) {
      return;
    }

    expect(isNavItemActive(dashboardItem, "/dashboard")).toBe(true);
    expect(isNavItemActive(dashboardItem, "/dashboard/sessions")).toBe(false);
  });

  it("sessions is active on sessions route and nested routes", () => {
    const sessionsItem = APP_NAV_ITEMS.find((item) => item.key === "sessions");
    expect(sessionsItem).toBeTruthy();

    if (!sessionsItem) {
      return;
    }

    expect(isNavItemActive(sessionsItem, "/dashboard/sessions")).toBe(true);
    expect(isNavItemActive(sessionsItem, "/dashboard/sessions/abc")).toBe(true);
    expect(isNavItemActive(sessionsItem, "/dashboard")).toBe(false);
  });

  it("clients placeholder and logout action are never active", () => {
    const clientsItem = APP_NAV_ITEMS.find((item) => item.key === "clients");
    const logoutItem = APP_NAV_ITEMS.find((item) => item.key === "logout");
    expect(clientsItem).toBeTruthy();
    expect(logoutItem).toBeTruthy();

    if (!clientsItem || !logoutItem) {
      return;
    }

    expect(isNavItemActive(clientsItem, "/dashboard")).toBe(false);
    expect(isNavItemActive(logoutItem, "/dashboard")).toBe(false);
  });

  it("maps nav items with active state for current path", () => {
    const states = mapNavItemsWithState("/dashboard/sessions");
    const dashboardState = states.find((item) => item.key === "dashboard");
    const sessionsState = states.find((item) => item.key === "sessions");

    expect(dashboardState?.isActive).toBe(false);
    expect(sessionsState?.isActive).toBe(true);
  });
});
