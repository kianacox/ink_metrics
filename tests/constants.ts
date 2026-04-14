export const DEFAULT_INBUCKET_BASE_URL = "http://127.0.0.1:54324";
export const DEFAULT_PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3001";
export const DEFAULT_MAILBOX_DOMAIN = "example.com";
export const DEFAULT_SEEDED_SESSION_USER_EMAIL = "seeded-session-user@example.com";
export const DEFAULT_SEEDED_INCOMPLETE_USER_EMAIL = "seeded-incomplete-user@example.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required E2E env var: ${name}`);
  }
  return value;
}

export function getSignUpPassword(): string {
  return requireEnv("E2E_SIGN_UP_PASSWORD");
}

export function getSeededUserPassword(): string {
  return process.env.E2E_SEEDED_USER_PASSWORD ?? getSignUpPassword();
}
