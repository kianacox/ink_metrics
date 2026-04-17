"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, LoadingState } from "@/components/ui";

type AnalyticsCardState = "loading" | "empty" | "ready";

interface AnalyticsCardProps {
  title: string;
  description: string;
  state: AnalyticsCardState;
  children?: ReactNode;
}

export function AnalyticsCard({
  title,
  description,
  state,
  children,
}: AnalyticsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
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
