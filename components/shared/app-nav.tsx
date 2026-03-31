"use client";

import Link from "next/link";
import { BarChart3, LogOut, Syringe, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  mapNavItemsWithState,
  type AppNavItemKey,
  type AppNavItemState,
} from "./app-nav-utils";
import { useLogout } from "@/components/auth/hooks/use-logout";

const navIcons: Record<AppNavItemKey, React.ComponentType<{ className?: string }>> = {
  dashboard: BarChart3,
  sessions: Syringe,
  clients: UserRound,
  logout: LogOut,
};

function DesktopNavItem({
  item,
  onLogout,
}: {
  item: AppNavItemState;
  onLogout: () => Promise<void>;
}) {
  const Icon = navIcons[item.key];
  const baseClassName =
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors";

  if (item.href && !item.disabled && !item.action) {
    return (
      <Link
        href={item.href}
        className={cn(
          baseClassName,
          item.isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  }

  if (item.action === "logout") {
    return (
      <button
        type="button"
        onClick={() => void onLogout()}
        className={cn(
          baseClassName,
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={cn(baseClassName, "cursor-not-allowed opacity-50 text-muted-foreground")}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </button>
  );
}

function MobileNavItem({
  item,
  onLogout,
}: {
  item: AppNavItemState;
  onLogout: () => Promise<void>;
}) {
  const Icon = navIcons[item.key];
  const baseClassName =
    "flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-xs transition-colors";

  if (item.href && !item.disabled && !item.action) {
    return (
      <Link
        href={item.href}
        className={cn(
          baseClassName,
          item.isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  }

  if (item.action === "logout") {
    return (
      <button
        type="button"
        onClick={() => void onLogout()}
        className={cn(
          baseClassName,
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled
      className={cn(baseClassName, "cursor-not-allowed opacity-50 text-muted-foreground")}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </button>
  );
}

export function DesktopSidebarNav() {
  const pathname = usePathname();
  const logout = useLogout();
  const navItems = mapNavItemsWithState(pathname);

  return (
    <aside className="hidden lg:block lg:w-56 lg:shrink-0 lg:self-start">
      <nav
        aria-label="Primary"
        className="sticky top-24 rounded-lg border border-border bg-card p-3 shadow-sm"
      >
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.key}>
              <DesktopNavItem item={item} onLogout={logout} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const logout = useLogout();
  const navItems = mapNavItemsWithState(pathname);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-4 gap-2">
        {navItems.map((item) => (
          <li key={item.key}>
            <MobileNavItem item={item} onLogout={logout} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
