import { getAuthErrorMessage } from "./page";

describe("getAuthErrorMessage", () => {
  it("maps known auth error codes to safe copy", () => {
    expect(getAuthErrorMessage("missing_token_or_type")).toBe(
      "The sign-in link is incomplete or expired. Please try again.",
    );
    expect(getAuthErrorMessage("otp_verification_failed")).toBe(
      "We could not verify your sign-in link. Please request a new one.",
    );
    expect(getAuthErrorMessage("verified_user_missing")).toBe(
      "We could not finish sign-in setup. Please try again.",
    );
  });

  it("returns fallback copy for unknown codes and empty values", () => {
    expect(getAuthErrorMessage("internal-db-error")).toBe(
      "We could not complete authentication. Please retry the action.",
    );
    expect(getAuthErrorMessage("")).toBe("An unspecified error occurred.");
    expect(getAuthErrorMessage(undefined)).toBe("An unspecified error occurred.");
  });
});
