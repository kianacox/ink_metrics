import { resolveProxyRedirectPath } from "./proxy-auth-guard";
import { shouldFailClosedForMissingSupabaseEnv } from "./proxy-auth-guard";

describe("resolveProxyRedirectPath", () => {
  it("does not redirect unauthenticated users for public routes", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/auth/login",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/auth/confirm",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/privacy-policy",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/terms-and-conditions",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/pricing",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
  });

  it("does not redirect unauthenticated users for API routes", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/api/expenses",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/api/sessions",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBeNull();
  });

  it("redirects unauthenticated users for protected routes", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBe("/auth/login");
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard/sessions",
        hasUser: false,
        isProfileComplete: false,
      }),
    ).toBe("/auth/login");
  });

  it("redirects incomplete authenticated users to setup", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard",
        hasUser: true,
        isProfileComplete: false,
      }),
    ).toBe("/dashboard/profile-setup");
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard/sessions",
        hasUser: true,
        isProfileComplete: false,
      }),
    ).toBe("/dashboard/profile-setup");
  });

  it("allows incomplete authenticated users to stay on setup route", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard/profile-setup",
        hasUser: true,
        isProfileComplete: false,
      }),
    ).toBeNull();
  });

  it("redirects complete users away from setup route", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard/profile-setup",
        hasUser: true,
        isProfileComplete: true,
      }),
    ).toBe("/dashboard");
  });

  it("does not redirect complete authenticated users for dashboard routes", () => {
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard",
        hasUser: true,
        isProfileComplete: true,
      }),
    ).toBeNull();
    expect(
      resolveProxyRedirectPath({
        pathname: "/dashboard/sessions",
        hasUser: true,
        isProfileComplete: true,
      }),
    ).toBeNull();
  });
});

describe("shouldFailClosedForMissingSupabaseEnv", () => {
  it("fails closed in production when env vars are missing", () => {
    expect(
      shouldFailClosedForMissingSupabaseEnv({
        hasEnvVars: false,
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("allows bypass outside production when env vars are missing", () => {
    expect(
      shouldFailClosedForMissingSupabaseEnv({
        hasEnvVars: false,
        nodeEnv: "development",
      }),
    ).toBe(false);
    expect(
      shouldFailClosedForMissingSupabaseEnv({
        hasEnvVars: false,
        nodeEnv: "test",
      }),
    ).toBe(false);
  });

  it("never blocks when env vars are configured", () => {
    expect(
      shouldFailClosedForMissingSupabaseEnv({
        hasEnvVars: true,
        nodeEnv: "production",
      }),
    ).toBe(false);
  });
});
