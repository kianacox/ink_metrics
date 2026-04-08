interface ResolveProxyRedirectPathParams {
  pathname: string;
  hasUser: boolean;
  isProfileComplete: boolean;
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
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
