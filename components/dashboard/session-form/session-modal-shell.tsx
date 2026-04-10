"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SessionModalShellProps {
  open: boolean;
  title: string;
  description: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  cardClassName?: string;
  contentClassName?: string;
}

export function SessionModalShell({
  open,
  title,
  description,
  titleId,
  onClose,
  children,
  cardClassName,
  contentClassName,
}: SessionModalShellProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-x-hidden bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <Card
        className={cn(
          "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-1rem))] min-w-0 w-full max-w-full overflow-x-hidden overflow-y-auto rounded-b-none rounded-t-2xl border-border shadow-lg sm:max-h-[min(90dvh,40rem)] sm:max-w-md sm:rounded-xl",
          "pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pt-0",
          cardClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          aria-hidden
        />
        <CardHeader className="space-y-1.5 p-4 pb-3 sm:p-6 sm:pb-3">
          <CardTitle id={titleId} className="text-lg sm:text-xl">
            {title}
          </CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </CardHeader>
        <CardContent className={cn("p-4 pt-1 sm:p-6 sm:pt-1", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
