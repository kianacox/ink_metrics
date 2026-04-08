"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

const DASHBOARD_PATH = "/dashboard";

export function ProfileSetupComplete() {
  function handleContinueToDashboard() {
    window.location.assign(DASHBOARD_PATH);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            You&apos;re all setup! Welcome to inkMetrics.
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your profile is complete and your dashboard is ready. Start logging
            sessions to build your business insights.
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleContinueToDashboard}
          >
            Continue to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
