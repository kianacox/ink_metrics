import { shouldRedirectToLogin } from "./proxy-auth-guard";

describe("shouldRedirectToLogin", () => {
  it("does not redirect for public routes", () => {
    expect(shouldRedirectToLogin("/", false)).toBe(false);
    expect(shouldRedirectToLogin("/auth/login", false)).toBe(false);
    expect(shouldRedirectToLogin("/auth/confirm", false)).toBe(false);
    expect(shouldRedirectToLogin("/login", false)).toBe(false);
  });

  it("redirects unauthenticated users for protected routes", () => {
    expect(shouldRedirectToLogin("/dashboard", false)).toBe(true);
    expect(shouldRedirectToLogin("/dashboard/sessions", false)).toBe(true);
  });

  it("does not redirect authenticated users for protected routes", () => {
    expect(shouldRedirectToLogin("/dashboard", true)).toBe(false);
    expect(shouldRedirectToLogin("/dashboard/sessions", true)).toBe(false);
  });
});
