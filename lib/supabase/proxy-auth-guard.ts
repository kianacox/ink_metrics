interface ResolveProxyRedirectPathParams {
  pathname: string;
  hasUser: boolean;
  isProfileComplete: boolean;
}

interface MissingEnvGuardParams {
  hasEnvVars: boolean;
  nodeEnv: string | undefined;
}

export function shouldFailClosedForMissingSupabaseEnv({
  hasEnvVars,
  nodeEnv,
}: MissingEnvGuardParams): boolean {
  return !hasEnvVars && nodeEnv === "production";
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return true;
  }

  if (pathname.startsWith("/privacy-policy")) {
    return true;
  }

  // API routes handle their own auth and must return JSON, not redirects.
  if (pathname.startsWith("/api/")) {
    return true;
  }

  return false;
}

export function resolveProxyRedirectPath({
  pathname,
  hasUser,
  isProfileComplete,
}: ResolveProxyRedirectPathParams): string | null {
  if (!hasUser) {
    if (isPublicRoute(pathname)) {
      return null;
    }

    return "/auth/login";
  }

  if (pathname.startsWith("/dashboard/profile-setup")) {
    return isProfileComplete ? "/dashboard" : null;
  }

  if (pathname.startsWith("/dashboard") && !isProfileComplete) {
    return "/dashboard/profile-setup";
  }

  return null;
}
