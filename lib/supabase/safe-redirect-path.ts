export function sanitizeInternalRedirectPath(
  redirectTo: string | null | undefined,
  fallbackPath = "/auth/login",
): string {
  if (!redirectTo) {
    return fallbackPath;
  }

  const [path] = redirectTo.split("?");
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallbackPath;
  }
  if (path.includes("://")) {
    return fallbackPath;
  }

  return path;
}
