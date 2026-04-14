import { sanitizeInternalRedirectPath } from "./safe-redirect-path";

describe("sanitizeInternalRedirectPath", () => {
  it("allows safe internal redirect paths", () => {
    expect(sanitizeInternalRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeInternalRedirectPath("/dashboard?tab=expenses")).toBe("/dashboard");
  });

  it("falls back for unsafe redirect values", () => {
    expect(sanitizeInternalRedirectPath("dashboard")).toBe("/auth/login");
    expect(sanitizeInternalRedirectPath("//evil.com/path")).toBe("/auth/login");
    expect(sanitizeInternalRedirectPath("https://evil.com/path")).toBe("/auth/login");
    expect(sanitizeInternalRedirectPath("/https://evil.com/path")).toBe("/auth/login");
  });
});
