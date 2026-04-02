export function shouldRedirectToLogin(pathname: string, hasUser: boolean): boolean {
  if (pathname === "/") {
    return false;
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return false;
  }

  return !hasUser;
}
