export type AppNavItemKey = "dashboard" | "sessions" | "profile" | "logout";
export type AppNavItemAction = "logout";

export interface AppNavItemDefinition {
  key: AppNavItemKey;
  label: string;
  href?: string;
  matchPrefixes?: string[];
  disabled?: boolean;
  action?: AppNavItemAction;
}

export interface AppNavItemState extends AppNavItemDefinition {
  isActive: boolean;
}

export const APP_NAV_ITEMS: AppNavItemDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    matchPrefixes: ["/dashboard"],
  },
  {
    key: "sessions",
    label: "Sessions",
    href: "/dashboard/sessions",
    matchPrefixes: ["/dashboard/sessions"],
  },
  {
    key: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    matchPrefixes: ["/dashboard/profile"],
  },
  {
    key: "logout",
    label: "Logout",
    action: "logout",
  },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) {
    return true;
  }

  return pathname.startsWith(`${prefix}/`);
}

export function isNavItemActive(
  item: AppNavItemDefinition,
  pathname: string,
): boolean {
  if (!item.href || item.disabled || item.action) {
    return false;
  }

  if (item.key === "dashboard") {
    return pathname === item.href;
  }

  const prefixes = item.matchPrefixes ?? [item.href];
  return prefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function mapNavItemsWithState(pathname: string): AppNavItemState[] {
  return APP_NAV_ITEMS.map((item) => ({
    ...item,
    isActive: isNavItemActive(item, pathname),
  }));
}
