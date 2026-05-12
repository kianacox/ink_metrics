"use client";

import Link, { type LinkProps } from "next/link";

type TrackedLinkProps = LinkProps & {
  eventName: string;
  eventParams?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
};

export function TrackedLink({
  eventName,
  eventParams,
  onClick,
  children,
  ...linkProps
}: TrackedLinkProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", eventName, eventParams);
    }
    onClick?.(e);
  }

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  );
}
