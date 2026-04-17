"use client";

import type { ReactNode } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

type AnalyticsCardState = "loading" | "error" | "empty" | "ready";

interface AnalyticsCardProps {
  title: string;
  description: string;
  state: AnalyticsCardState;
  children?: ReactNode;
  onRetry?: () => void;
}

export function AnalyticsCard({
  title,
  description,
  state,
  children,
  onRetry,
}: AnalyticsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading metric…</p>
        ) : null}
        {state === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Could not load this metric.</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
        {state === "empty" ? (
          <p className="text-sm text-muted-foreground">No data yet for this month.</p>
        ) : null}
        {state === "ready" ? children : null}
      </CardContent>
    </Card>
  );
}
