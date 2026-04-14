import { safeNextPath, shouldBootstrapVerifiedUser } from "./route";

describe("safeNextPath", () => {
  it("falls back to dashboard when next is null or empty", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("keeps safe in-app paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/dashboard/sessions?sort=date")).toBe("/dashboard/sessions");
  });

  it("rejects non-relative and protocol-style redirects", () => {
    expect(safeNextPath("dashboard")).toBe("/dashboard");
    expect(safeNextPath("//evil.com/path")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com/path")).toBe("/dashboard");
    expect(safeNextPath("/https://evil.com/path")).toBe("/dashboard");
  });

  it("strips untrusted query parameters from safe paths", () => {
    expect(safeNextPath("/dashboard?next=https://evil.com")).toBe("/dashboard");
  });
});

describe("shouldBootstrapVerifiedUser", () => {
  it("returns false for email change confirmations", () => {
    expect(shouldBootstrapVerifiedUser("email_change")).toBe(false);
  });

  it("returns true for non-email-change confirmation types", () => {
    expect(shouldBootstrapVerifiedUser("email")).toBe(true);
    expect(shouldBootstrapVerifiedUser("recovery")).toBe(true);
    expect(shouldBootstrapVerifiedUser("invite")).toBe(true);
  });
});
