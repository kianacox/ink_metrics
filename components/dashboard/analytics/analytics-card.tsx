"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, LoadingState } from "@/components/ui";

type AnalyticsCardState = "loading" | "empty" | "ready";

interface AnalyticsCardProps {
  title: string;
  description: string;
  state: AnalyticsCardState;
  headerAction?: ReactNode;
  children?: ReactNode;
}

export function AnalyticsCard({
  title,
  description,
  state,
  headerAction,
  children,
}: AnalyticsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="leading-tight text-base">{title}</CardTitle>
          {headerAction ? <div className="mt-[-1px] shrink-0">{headerAction}</div> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <LoadingState message="Loading metric…" />
        ) : null}
        {state === "empty" ? (
          <p className="text-sm text-muted-foreground">No data yet for this month.</p>
        ) : null}
        {state === "ready" ? children : null}
      </CardContent>
    </Card>
  );
}
