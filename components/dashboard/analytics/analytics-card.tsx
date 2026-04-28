"use client";

import type { ReactNode } from "react";
import { AnimatedCard } from "@/components/ui/animated-card";
import { CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui";

type AnalyticsCardState = "loading" | "empty" | "ready";

interface AnalyticsCardProps {
  title: string;
  description: string;
  state: AnalyticsCardState;
  index?: number;
  headerAction?: ReactNode;
  children?: ReactNode;
}

export function AnalyticsCard({
  title,
  description,
  state,
  index = 0,
  headerAction,
  children,
}: AnalyticsCardProps) {
  return (
    <AnimatedCard index={index} className="h-full" {...(state === "loading" ? { initial: false } : {})}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="leading-tight text-base">{title}</CardTitle>
          {headerAction ? <div className="mt-[-1px] shrink-0">{headerAction}</div> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}
        {state === "empty" ? (
          <p className="text-sm text-muted-foreground">No data yet for this month.</p>
        ) : null}
        {state === "ready" ? children : null}
      </CardContent>
    </AnimatedCard>
  );
}
