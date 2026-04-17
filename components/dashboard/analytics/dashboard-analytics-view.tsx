"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/dashboard/analytics/analytics-card";
import {
  formatHours,
  formatMinorAsCurrency,
  formatPercentage,
  type DashboardAnalyticsResponse,
} from "@/lib/dashboard-analytics";

function hasAnyMetricData(analytics: DashboardAnalyticsResponse): boolean {
  if (
    analytics.takeHome.grossMinor !== 0 ||
    analytics.takeHome.paidToStudioMinor !== 0 ||
    analytics.takeHome.totalExpensesMinor !== 0 ||
    analytics.takeHome.netMinor !== 0
  ) {
    return true;
  }

  if (
    analytics.retention.numerator !== 0 ||
    analytics.retention.denominator !== 0 ||
    analytics.retention.rate !== 0
  ) {
    return true;
  }

  if (
    analytics.averageProfitPerSession.valueMinor !== 0 ||
    analytics.averageProfitPerSession.sessionCount !== 0
  ) {
    return true;
  }

  if (analytics.hoursTattooing.totalMinutes !== 0 || analytics.hoursTattooing.totalHours !== 0) {
    return true;
  }

  if (analytics.expensesByCategory.totalMinor !== 0) {
    return true;
  }

  return analytics.expensesByCategory.items.some((item) => item.totalMinor !== 0);
}

export function DashboardAnalyticsView({
  currencyCode,
}: {
  currencyCode: string;
}) {
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/analytics?month=current", {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Could not load dashboard analytics.");
      }

      const payload = (await response.json()) as DashboardAnalyticsResponse;
      setAnalytics(payload);
    } catch {
      setError("Could not load dashboard analytics.");
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const cardState = useMemo(() => {
    if (isLoading) {
      return "loading" as const;
    }

    if (error) {
      return "error" as const;
    }

    if (!analytics || !hasAnyMetricData(analytics)) {
      return "empty" as const;
    }

    return "ready" as const;
  }, [analytics, error, isLoading]);

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnalyticsCard
        title="Take-home summary"
        description="Gross, studio deductions, expenses, and net."
        state={cardState}
        onRetry={() => void loadAnalytics()}
      >
        <div className="space-y-2 text-sm">
          <p>
            Gross:{" "}
            <span className="font-semibold">
              {formatMinorAsCurrency(analytics?.takeHome.grossMinor ?? 0, currencyCode)}
            </span>
          </p>
          <p>
            Paid to studio:{" "}
            <span className="font-semibold">
              {formatMinorAsCurrency(analytics?.takeHome.paidToStudioMinor ?? 0, currencyCode)}
            </span>
          </p>
          <p>
            Total expenses:{" "}
            <span className="font-semibold">
              {formatMinorAsCurrency(analytics?.takeHome.totalExpensesMinor ?? 0, currencyCode)}
            </span>
          </p>
          <p>
            Net:{" "}
            <span className="font-semibold">
              {formatMinorAsCurrency(analytics?.takeHome.netMinor ?? 0, currencyCode)}
            </span>
          </p>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        title="Client retention rate"
        description="Repeat clients this month."
        state={cardState}
        onRetry={() => void loadAnalytics()}
      >
        <div className="space-y-2 text-sm">
          <p className="text-2xl font-semibold text-foreground">
            {formatPercentage(analytics?.retention.rate ?? 0)}
          </p>
          <p className="text-muted-foreground">
            {analytics?.retention.numerator ?? 0} of {analytics?.retention.denominator ?? 0}{" "}
            clients returned.
          </p>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        title="Average profit per session"
        description="Net take-home divided by session count."
        state={cardState}
        onRetry={() => void loadAnalytics()}
      >
        <div className="space-y-2 text-sm">
          <p className="text-2xl font-semibold text-foreground">
            {formatMinorAsCurrency(analytics?.averageProfitPerSession.valueMinor ?? 0, currencyCode)}
          </p>
          <p className="text-muted-foreground">
            Sessions this month: {analytics?.averageProfitPerSession.sessionCount ?? 0}
          </p>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        title="Hours spent tattooing"
        description="Total session time across the month."
        state={cardState}
        onRetry={() => void loadAnalytics()}
      >
        <div className="space-y-2 text-sm">
          <p className="text-2xl font-semibold text-foreground">
            {formatHours(analytics?.hoursTattooing.totalHours ?? 0)}
          </p>
          <p className="text-muted-foreground">
            Total minutes: {analytics?.hoursTattooing.totalMinutes ?? 0}
          </p>
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        title="Expenses by category"
        description="Monthly spend rollup by expense category."
        state={cardState}
        onRetry={() => void loadAnalytics()}
      >
        <div className="space-y-2 text-sm">
          <ul className="space-y-1">
            {(analytics?.expensesByCategory.items ?? []).map((item) => (
              <li key={item.category} className="flex items-center justify-between gap-2">
                <span className="capitalize text-muted-foreground">{item.category.replaceAll("_", " ")}</span>
                <span className="font-medium">
                  {formatMinorAsCurrency(item.totalMinor, currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <p>
            Total:{" "}
            <span className="font-semibold">
              {formatMinorAsCurrency(analytics?.expensesByCategory.totalMinor ?? 0, currencyCode)}
            </span>
          </p>
        </div>
      </AnalyticsCard>
    </section>
  );
}
